import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import postgres from 'postgres';
import { createTrackerWorker } from '../../scripts/tracker-worker';
import { availabilityIsStale } from '../../src/lib/server/availability';
import { encryptSecret } from '../../src/lib/server/secret-crypto';

if (process.env.ALLOW_INTEGRATION_DB_RESET !== 'true') {
	throw new Error(
		'Set ALLOW_INTEGRATION_DB_RESET=true only for a disposable integration database.'
	);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for integration tests.');

process.env.SECRET_ENCRYPTION_KEY ??= 'integration-test-encryption-key-at-least-32-characters';
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => undefined });
const appUrl = 'http://prizen.test';

async function resetDatabase() {
	await sql`truncate table users, marketplaces restart identity cascade`;
}

async function seedTracker(options: { targetPrice?: number | null; channels?: boolean } = {}) {
	const [user] = await sql<{ id: string }[]>`
		insert into users (email, password_hash) values ('tracker-test@prizen.local', 'disabled')
		returning id
	`;
	const [marketplace] = await sql<{ id: string }[]>`
		insert into marketplaces (slug, name, website_url)
		values ('amazon', 'Amazon', 'https://www.amazon.in/') returning id
	`;
	const [product] = await sql<{ id: string }[]>`
		insert into products (
			user_id, marketplace_id, external_id, url, title, currency, target_price,
			polling_interval_seconds, next_poll_at
		) values (
			${user.id}, ${marketplace.id}, 'B000000001',
			'https://www.amazon.in/dp/B000000001', 'Initial product', 'INR',
			${options.targetPrice === undefined ? 900 : options.targetPrice}, 900, now()
		) returning id
	`;
	await sql`
		insert into price_history (product_id, price, currency, availability)
		values (${product.id}, '1200', 'INR', 'in_stock')
	`;
	await sql`
		insert into latest_prices (product_id, price, currency, availability)
		values (${product.id}, '1200', 'INR', 'in_stock')
	`;
	await sql`insert into scan_jobs (product_id, run_at) values (${product.id}, now())`;
	if (options.channels !== false) {
		await sql`
			insert into notification_channels (user_id, provider, label, secret_reference, is_verified)
			values
				(${user.id}, 'discord', 'Discord test', ${encryptSecret('https://discord.com/api/webhooks/test/token')}, true),
				(${user.id}, 'telegram', 'Telegram test', ${encryptSecret(JSON.stringify({ chatId: '12345', botToken: 'bot-test' }))}, true)
		`;
	}
	return product.id;
}

function preview(price: number | null, availability: 'in_stock' | 'out_of_stock') {
	return new Response(
		JSON.stringify({
			title: 'Scanned product',
			url: 'https://www.amazon.in/dp/B000000001',
			currentPrice: price,
			currency: 'INR',
			availability
		}),
		{ headers: { 'content-type': 'application/json' } }
	);
}

function worker(fetcher: typeof fetch) {
	return createTrackerWorker({
		sql,
		appUrl,
		trackerToken: 'integration-tracker-token',
		fetcher,
		logger: { error: () => undefined }
	});
}

describe('tracker persistence and notification delivery', () => {
	beforeEach(resetDatabase);
	after(() => sql.end());

	test('persists a scan and delivers record-low and target-price events', async () => {
		const notificationRequests: string[] = [];
		const productId = await seedTracker();
		await worker((async (input) => {
			const url = input.toString();
			if (url === `${appUrl}/api/products/preview`) return preview(800, 'in_stock');
			notificationRequests.push(url);
			return new Response(null, { status: 204 });
		}) as typeof fetch).scanDueProducts();

		const history = await sql<{ price: string; availability: string }[]>`
			select price, availability from price_history where product_id = ${productId}
			order by observed_at
		`;
		assert.deepEqual(
			history.map((row) => [Number(row.price), row.availability]),
			[
				[1200, 'in_stock'],
				[800, 'in_stock']
			]
		);
		const logs = await sql<{ provider: string; event_type: string; status: string }[]>`
			select channel.provider, log.event_type, log.status
			from notification_logs log join notification_channels channel on channel.id = log.channel_id
			order by channel.provider, log.event_type
		`;
		assert.equal(logs.length, 4);
		assert.deepEqual(
			new Set(logs.map((log) => log.event_type)),
			new Set(['record_low', 'target_price'])
		);
		assert.ok(logs.every((log) => log.status === 'sent'));
		assert.equal(notificationRequests.length, 4);
	});

	test('backs off Discord and Telegram failures without losing notifications', async () => {
		await seedTracker();
		await worker((async (input) =>
			input.toString() === `${appUrl}/api/products/preview`
				? preview(800, 'in_stock')
				: new Response('unavailable', { status: 503 })) as typeof fetch).scanDueProducts();

		const logs = await sql<
			{
				provider: string;
				status: string;
				attempts: number;
				retry_scheduled: boolean;
			}[]
		>`
			select channel.provider, log.status, log.attempts,
				log.next_attempt_at > log.attempted_at as retry_scheduled
			from notification_logs log join notification_channels channel on channel.id = log.channel_id
		`;
		assert.equal(logs.length, 4);
		assert.deepEqual(new Set(logs.map((log) => log.provider)), new Set(['discord', 'telegram']));
		assert.ok(
			logs.every((log) => log.status === 'failed' && log.attempts === 1 && log.retry_scheduled)
		);
	});

	test('persists out-of-stock availability and exposes a failed scan as stale', async () => {
		const productId = await seedTracker({ targetPrice: null, channels: false });
		const tracker = worker((async () => preview(null, 'out_of_stock')) as typeof fetch);
		await tracker.scanDueProducts();
		const [latest] = await sql<{ availability: string; observed_at: Date }[]>`
			select availability, observed_at from latest_prices where product_id = ${productId}
		`;
		assert.equal(latest.availability, 'out_of_stock');

		await sql`update scan_jobs set run_at = now(), status = 'pending' where product_id = ${productId}`;
		await worker(
			(async () => new Response('failed', { status: 502 })) as typeof fetch
		).scanDueProducts();
		const [job] = await sql<{ status: string; failure_count: number }[]>`
			select status, failure_count from scan_jobs where product_id = ${productId}
		`;
		assert.equal(job.status, 'failed');
		assert.equal(job.failure_count, 1);
		assert.equal(availabilityIsStale(job.status, latest.observed_at, 900), true);
	});
});
