import postgres from 'postgres';
import { logger } from './logger';
import { decryptSecret } from '../src/lib/server/secret-crypto';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');
const sql = postgres(databaseUrl);
const appUrl = process.env.APP_URL ?? 'http://app:3000';

type DueProduct = {
	job_id: string;
	id: string;
	url: string;
	polling_interval_seconds: number;
	attempts: number;
	target_price: string | null;
	delivery_pincode: string | null;
	user_id: string;
};
type PendingNotification = {
	id: string;
	provider: 'discord' | 'telegram';
	secret_reference: string;
	title: string;
	price: string;
	currency: string;
	event_type: 'record_low' | 'target_price';
	attempts: number;
};

function telegramDestination(secretReference: string) {
	try {
		const value = JSON.parse(decryptSecret(secretReference)) as {
			chatId?: unknown;
			botToken?: unknown;
		};
		if (typeof value.chatId === 'string' && typeof value.botToken === 'string') return value;
	} catch {
		/* Invalid channel data is treated as an undeliverable notification. */
	}
	throw new Error('Telegram channel credentials are invalid');
}

async function queueNotifications(
	productId: string,
	priceHistoryId: string,
	title: string,
	price: number,
	currency: string,
	eventType: 'record_low' | 'target_price'
) {
	const eventKey = `${eventType}:${priceHistoryId}`;
	await sql`
		insert into notification_logs (
			channel_id, product_id, price_history_id, event_key, event_type, status, metadata
		)
		select id, ${productId}, ${priceHistoryId}, ${eventKey}, ${eventType}, 'pending',
			jsonb_build_object('title', ${title}, 'price', ${String(price)}, 'currency', ${currency})
		from notification_channels
		where is_verified = true
			and user_id = (select user_id from products where id = ${productId})
		on conflict (channel_id, event_key) do nothing
	`;
}

async function deliverPendingNotifications() {
	const pending = await sql<PendingNotification[]>`
		select log.id, channel.provider, channel.secret_reference,
			log.metadata->>'title' as title, log.metadata->>'price' as price,
			log.metadata->>'currency' as currency, log.event_type, log.attempts
		from notification_logs log
		join notification_channels channel on channel.id = log.channel_id
		where log.status in ('pending', 'failed') and log.next_attempt_at <= now()
		order by log.next_attempt_at
		limit 50
	`;
	for (const notification of pending) {
		try {
			const content =
				notification.event_type === 'target_price'
					? `Target reached: ${notification.title} is now ${notification.currency} ${notification.price}.`
					: `New record low: ${notification.title} is now ${notification.currency} ${notification.price}.`;
			const response =
				notification.provider === 'discord'
					? await fetch(decryptSecret(notification.secret_reference), {
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ content }),
							signal: AbortSignal.timeout(15_000)
						})
					: await (async () => {
							const destination = telegramDestination(notification.secret_reference);
							return fetch(`https://api.telegram.org/bot${destination.botToken}/sendMessage`, {
								method: 'POST',
								headers: { 'content-type': 'application/json' },
								body: JSON.stringify({ chat_id: destination.chatId, text: content }),
								signal: AbortSignal.timeout(15_000)
							});
						})();
			if (!response.ok) throw new Error(`${notification.provider} returned ${response.status}`);
			await sql`update notification_logs set status = 'sent', delivered_at = now(), attempted_at = now(), attempts = attempts + 1 where id = ${notification.id}`;
		} catch (exception) {
			const retrySeconds = Math.min(60 * 2 ** notification.attempts, 3600);
			logger.error(
				{ err: exception, notificationId: notification.id, provider: notification.provider },
				'Notification delivery failed'
			);
			await sql`update notification_logs set status = 'failed', attempted_at = now(), attempts = attempts + 1, next_attempt_at = now() + (${retrySeconds} * interval '1 second') where id = ${notification.id}`;
		}
	}
}

async function scanDueProducts() {
	await sql`
		insert into scan_jobs (product_id, run_at)
		select id, next_poll_at from products where status = 'active'
		on conflict (product_id) do nothing
	`;
	await sql`update scan_jobs set status = 'pending', run_at = now(), locked_at = null, updated_at = now() where status = 'running' and locked_at < now() - interval '5 minutes'`;
	const due = await sql<DueProduct[]>`with due as (
		select job.id as job_id, product.id, product.url, product.polling_interval_seconds, job.attempts,
			product.target_price, product.user_id, settings.delivery_pincode
		from scan_jobs job
		join products product on product.id = job.product_id
		left join user_settings settings on settings.user_id = product.user_id
		where job.status in ('pending', 'failed') and job.run_at <= now() and product.status = 'active'
		order by job.run_at
		for update of job skip locked
		limit 25
	)
	update scan_jobs job set status = 'running', locked_at = now(), updated_at = now()
	from due where job.id = due.job_id
	returning due.job_id, due.id, due.url, due.polling_interval_seconds, due.attempts, due.target_price, due.user_id`;
	for (const product of due) {
		try {
			const response = await fetch(`${appUrl}/api/products/preview`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${process.env.TRACKER_TOKEN ?? ''}`
				},
				body: JSON.stringify({ url: product.url, userId: product.user_id })
			});
			if (!response.ok) throw new Error(`preview returned ${response.status}`);
			const data = (await response.json()) as {
				title: string;
				url: string;
				currentPrice: number | null;
				currency: string;
				availability: 'in_stock' | 'out_of_stock';
			};
			const events = await sql.begin(async (transaction) => {
				const [previous] = await transaction<{ lowest_price: string | null }[]>`
					select min(price) as lowest_price from price_history where product_id = ${product.id}
				`;
				const [latest] = await transaction<{ price: string; availability: string }[]>`
					select price, availability from latest_prices where product_id = ${product.id}
				`;
				const price = data.currentPrice ?? (latest ? Number(latest.price) : null);
				if (price === null) throw new Error('Out-of-stock product has no previous price.');
				const [observation] = await transaction<{ id: string }[]>`
					insert into price_history (product_id, price, currency, availability)
					values (${product.id}, ${String(price)}, ${data.currency}, ${data.availability}) returning id
				`;
				await transaction`update products set title = ${data.title}, url = ${data.url}, currency = ${data.currency}, last_polled_at = now(), next_poll_at = now() + (${product.polling_interval_seconds} * interval '1 second'), updated_at = now() where id = ${product.id}`;
				await transaction`insert into latest_prices (product_id, price, currency, availability) values (${product.id}, ${String(price)}, ${data.currency}, ${data.availability}) on conflict (product_id) do update set price = excluded.price, currency = excluded.currency, availability = excluded.availability, observed_at = now()`;
				return {
					recordLow:
						previous.lowest_price !== null && price < Number(previous.lowest_price)
							? observation.id
							: null,
					targetReached:
						product.target_price !== null &&
						price <= Number(product.target_price) &&
						latest !== undefined &&
						Number(latest.price) > Number(product.target_price)
							? observation.id
							: null,
					price
				};
			});
			if (events.recordLow) {
				await queueNotifications(
					product.id,
					events.recordLow,
					data.title,
					events.price,
					data.currency,
					'record_low'
				);
			}
			if (events.targetReached)
				await queueNotifications(
					product.id,
					events.targetReached,
					data.title,
					events.price,
					data.currency,
					'target_price'
				);
			await sql`update scan_jobs set status = 'pending', attempts = 0, last_error = null, locked_at = null, run_at = now() + (${product.polling_interval_seconds} * interval '1 second'), updated_at = now() where id = ${product.job_id}`;
		} catch (exception) {
			logger.error({ err: exception, productId: product.id }, 'Price scan failed');
			const retrySeconds = Math.min(60 * 2 ** product.attempts, 3600);
			await sql`update scan_jobs set status = 'failed', attempts = attempts + 1, failure_count = failure_count + 1, last_error = ${exception instanceof Error ? exception.message : String(exception)}, locked_at = null, run_at = now() + (${retrySeconds} * interval '1 second'), updated_at = now() where id = ${product.job_id}`;
		}
	}
	await deliverPendingNotifications();
}

async function recordHeartbeat(error?: unknown) {
	const lastError = error instanceof Error ? error.message : error ? String(error) : null;
	await sql`
		insert into tracker_heartbeats (name, last_success_at, last_error_at, last_error)
		values ('tracker', now(), ${lastError ? new Date() : null}, ${lastError})
		on conflict (name) do update set
			last_success_at = excluded.last_success_at,
			last_error_at = excluded.last_error_at,
			last_error = excluded.last_error
	`;
}

let scanning = false;

async function runScan() {
	if (scanning) return;
	scanning = true;
	try {
		await scanDueProducts();
		await recordHeartbeat();
	} catch (exception) {
		logger.error({ err: exception }, 'Tracker scan cycle failed; retrying on the next interval');
		try {
			await recordHeartbeat(exception);
		} catch {
			/* A database outage prevents heartbeat writes too; the health check will report it. */
		}
	} finally {
		scanning = false;
	}
}

logger.info('Tracker started');
await runScan();
setInterval(() => void runScan(), 5_000);
