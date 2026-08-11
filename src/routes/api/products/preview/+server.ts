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
import {
	fetchFlipkartSnapshot,
	isFlipkartUrl,
	type FlipkartAffiliateConfig
} from '$lib/server/marketplace/flipkart';

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
	if (!isAmazonUrl(url) && !isFlipkartUrl(url)) {
		throw error(422, 'Use an Amazon India, Amazon US, or Flipkart product link.');
	}
	const ownerUserId =
		locals.user?.id ?? (typeof body.userId === 'string' ? body.userId : undefined);
	if (!ownerUserId) throw error(400, 'The tracker request is missing its product owner.');
	const marketplaceSlug = isFlipkartUrl(url) ? 'flipkart' : 'amazon';
	const configuration = await db.query.marketplaceConfigurations.findFirst({
		where: and(
			eq(marketplaceConfigurations.userId, ownerUserId),
			eq(marketplaceConfigurations.marketplaceSlug, marketplaceSlug)
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
		if (marketplaceSlug === 'flipkart') {
			if (!configuration?.secretReference) {
				throw new MarketplaceFetchError('Configure Flipkart Affiliate API credentials first.', 503);
			}
			let affiliate: FlipkartAffiliateConfig;
			try {
				affiliate = JSON.parse(
					decryptSecret(configuration.secretReference)
				) as FlipkartAffiliateConfig;
			} catch {
				throw new MarketplaceFetchError(
					'The encrypted Flipkart Affiliate API configuration is invalid.',
					503
				);
			}
			return json({
				...(await fetchFlipkartSnapshot(url, fetch, affiliate)),
				marketplace: { slug: 'flipkart', name: 'Flipkart' }
			});
		}
		return json({
			...(await fetchAmazonSnapshot(url, fetch, {
				dataSource: configuration?.dataSource,
				creators
			})),
			marketplace: { slug: 'amazon', name: 'Amazon' }
		});
	} catch (exception) {
		if (exception instanceof MarketplaceFetchError)
			throw error(exception.status, exception.message);
		throw error(502, 'Prizen could not read this product page.');
	}
}
