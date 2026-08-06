import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notificationChannels } from '$lib/server/db/schema';
import { encryptSecret } from '$lib/server/secret-crypto';
import { notificationChannelSchema } from '$lib/schemas/settings';

type Provider = 'discord' | 'telegram';

function notificationText() {
	return 'Prizen notifications are connected. You will be alerted only when a tracked product reaches a new all-time low.';
}

async function verifyChannel(provider: Provider, destination: string, botToken?: string) {
	if (provider === 'discord') {
		let webhook: URL;
		try {
			webhook = new URL(destination);
		} catch {
			throw error(400, 'Enter a valid Discord webhook URL.');
		}
		if (
			webhook.protocol !== 'https:' ||
			!['discord.com', 'discordapp.com'].includes(webhook.hostname) ||
			!webhook.pathname.startsWith('/api/webhooks/')
		) {
			throw error(400, 'Enter a Discord webhook URL.');
		}
		const response = await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ content: notificationText() }),
			signal: AbortSignal.timeout(10_000)
		});
		if (!response.ok) throw error(422, 'Discord could not verify this webhook.');
		return;
	}
	if (!/^-?\d+$/.test(destination)) throw error(400, 'Enter a valid Telegram chat ID.');
	if (!botToken?.trim()) throw error(400, 'Enter a Telegram bot token.');
	const response = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ chat_id: destination, text: notificationText() }),
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) {
		throw error(422, 'Telegram could not reach this chat. Start the Prizen bot, then try again.');
	}
}

export async function GET({ locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const channels = await db.query.notificationChannels.findMany({
		where: eq(notificationChannels.userId, locals.user.id),
		columns: { id: true, provider: true, label: true, isVerified: true, createdAt: true },
		orderBy: (channel, { desc }) => [desc(channel.createdAt)]
	});
	return json(channels);
}

export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const parsed = notificationChannelSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid integration.');
	const body = parsed.data;
	const botToken = body.botToken;
	await verifyChannel(body.provider, body.destination, botToken);
	const [channel] = await db
		.insert(notificationChannels)
		.values({
			userId: locals.user.id,
			provider: body.provider,
			label: body.label,
			secretReference:
				body.provider === 'telegram'
					? encryptSecret(JSON.stringify({ chatId: body.destination, botToken }))
					: encryptSecret(body.destination),
			isVerified: true
		})
		.returning({
			id: notificationChannels.id,
			provider: notificationChannels.provider,
			label: notificationChannels.label,
			isVerified: notificationChannels.isVerified,
			createdAt: notificationChannels.createdAt
		});
	return json(channel, { status: 201 });
}
