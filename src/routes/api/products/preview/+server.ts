import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';
import {
	fetchAmazonSnapshot,
	isAmazonUrl,
	MarketplaceFetchError
} from '$lib/server/marketplace/amazon';

export async function POST({ request, fetch, locals, getClientAddress }) {
	const internalTracker =
		Boolean(env.TRACKER_TOKEN) &&
		request.headers.get('authorization') === `Bearer ${env.TRACKER_TOKEN}`;
	if (!locals.user && !internalTracker) throw error(401, 'Authentication required.');
	const rateKey = internalTracker ? 'tracker' : (locals.user?.id ?? getClientAddress());
	if (!consumeRateLimit(`preview:${rateKey}`, internalTracker ? 120 : 30, 60_000)) {
		throw error(429, 'Too many product checks. Try again shortly.');
	}
	const body = (await request.json()) as { url?: unknown; deliveryPincode?: unknown };
	if (typeof body.url !== 'string') throw error(400, 'A product URL is required.');
	let url: URL;
	try {
		url = new URL(body.url);
	} catch {
		throw error(400, 'Enter a valid product URL.');
	}
	if (!isAmazonUrl(url)) {
		throw error(422, 'Only Amazon India and Amazon US links are supported right now.');
	}
	let deliveryPincode: string | undefined;
	if (internalTracker) {
		if (typeof body.deliveryPincode === 'string' && /^\d{6}$/.test(body.deliveryPincode)) {
			deliveryPincode = body.deliveryPincode;
		}
	} else if (locals.user) {
		const settings = await db.query.userSettings.findFirst({
			where: eq(userSettings.userId, locals.user.id),
			columns: { deliveryPincode: true }
		});
		deliveryPincode = settings?.deliveryPincode ?? undefined;
	}
	try {
		return json(await fetchAmazonSnapshot(url, fetch, deliveryPincode));
	} catch (exception) {
		if (exception instanceof MarketplaceFetchError)
			throw error(exception.status, exception.message);
		throw error(502, 'Prizen could not read this product page.');
	}
}
