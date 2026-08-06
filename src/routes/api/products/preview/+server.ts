import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { marketplaceConfigurations } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { decryptSecret } from '$lib/server/secret-crypto';
import type { AmazonCreatorsConfig } from '$lib/server/marketplace/amazon';
import {
	fetchAmazonSnapshot,
	isAmazonUrl,
	MarketplaceFetchError
} from '$lib/server/marketplace/amazon-adapter';

export async function POST({ request, fetch, locals, getClientAddress }) {
	const internalTracker =
		Boolean(env.TRACKER_TOKEN) &&
		request.headers.get('authorization') === `Bearer ${env.TRACKER_TOKEN}`;
	if (!locals.user && !internalTracker) throw error(401, 'Authentication required.');
	const rateKey = internalTracker ? 'tracker' : (locals.user?.id ?? getClientAddress());
	if (!consumeRateLimit(`preview:${rateKey}`, internalTracker ? 120 : 30, 60_000)) {
		throw error(429, 'Too many product checks. Try again shortly.');
	}
	const body = (await request.json()) as { url?: unknown; userId?: unknown };
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
	const ownerUserId =
		locals.user?.id ?? (typeof body.userId === 'string' ? body.userId : undefined);
	if (!ownerUserId) throw error(400, 'The tracker request is missing its product owner.');
	const configuration = await db.query.marketplaceConfigurations.findFirst({
		where: and(
			eq(marketplaceConfigurations.userId, ownerUserId),
			eq(marketplaceConfigurations.marketplaceSlug, 'amazon')
		),
		columns: { dataSource: true, secretReference: true }
	});
	let creators: AmazonCreatorsConfig = {
		credentialId: '',
		credentialSecret: '',
		credentialVersion: ''
	};
	if (configuration?.secretReference) {
		try {
			creators = JSON.parse(decryptSecret(configuration.secretReference)) as AmazonCreatorsConfig;
		} catch {
			throw error(503, 'The encrypted Amazon Creators API configuration is invalid.');
		}
	}
	try {
		return json(
			await fetchAmazonSnapshot(url, fetch, {
				dataSource: configuration?.dataSource,
				creators
			})
		);
	} catch (exception) {
		if (exception instanceof MarketplaceFetchError)
			throw error(exception.status, exception.message);
		throw error(502, 'Prizen could not read this product page.');
	}
}
