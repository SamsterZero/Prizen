import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fetchAmazonSnapshot, MarketplaceFetchError, type AmazonCreatorsConfig } from './amazon';

const baseConfig: AmazonCreatorsConfig = {
	credentialId: 'credential-test',
	credentialSecret: 'secret-test',
	credentialVersion: '3.2',
	partnerTagIndia: 'prizen-in-21',
	partnerTagUnitedStates: 'prizen-us-20'
};

function jsonResponse(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function creatorsFetcher(
	itemPayload: unknown,
	requests: Array<{ url: string; init?: RequestInit }> = []
) {
	return (async (input: URL | RequestInfo, init?: RequestInit) => {
		const url = input.toString();
		requests.push({ url, init });
		if (url.includes('/auth/o2/token')) {
			return jsonResponse({ access_token: 'access-token', expires_in: 3600 });
		}
		return jsonResponse(itemPayload);
	}) as typeof fetch;
}

function itemResponse(
	overrides: Record<string, unknown> = {},
	listingOverrides: Record<string, unknown> = {}
) {
	return {
		itemsResult: {
			items: [
				{
					asin: 'B000000001',
					parentASIN: 'B000000000',
					detailPageURL: 'https://www.amazon.in/dp/B000000001?tag=prizen-in-21',
					itemInfo: { title: { displayValue: 'Validated product' } },
					offersV2: {
						listings: [
							{
								isBuyBoxWinner: true,
								availability: { type: 'IN_STOCK', message: 'In Stock' },
								merchantInfo: { id: 'seller-1', name: 'Example Seller' },
								price: { money: { amount: 1299, currency: 'INR' } },
								...listingOverrides
							}
						]
					},
					...overrides
				}
			]
		}
	};
}

describe('Amazon Creators API adapter', () => {
	test('requests documented product and offer resources and validates context', async () => {
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const snapshot = await fetchAmazonSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			creatorsFetcher(itemResponse(), requests),
			baseConfig
		);

		assert.deepEqual(snapshot, {
			asin: 'B000000001',
			parentAsin: 'B000000000',
			variantId: 'B000000001',
			title: 'Validated product',
			url: 'https://www.amazon.in/dp/B000000001?tag=prizen-in-21',
			currentPrice: 1299,
			currency: 'INR',
			availability: 'in_stock',
			sellerId: 'seller-1',
			sellerName: 'Example Seller',
			deliveryContext: 'marketplace_default'
		});
		assert.equal(requests.length, 2);
		assert.match(requests[0].url, /api\.amazon\.co\.uk\/auth\/o2\/token/);
		const tokenBody = JSON.parse(String(requests[0].init?.body)) as Record<string, string>;
		assert.equal(tokenBody.scope, 'creatorsapi::default');
		const apiHeaders = requests[1].init?.headers as Record<string, string>;
		assert.equal(apiHeaders['x-marketplace'], 'www.amazon.in');
		assert.equal(apiHeaders.authorization, 'Bearer access-token');
		const body = JSON.parse(String(requests[1].init?.body)) as {
			itemIds: string[];
			partnerTag: string;
			resources: string[];
		};
		assert.deepEqual(body.itemIds, ['B000000001']);
		assert.equal(body.partnerTag, 'prizen-in-21');
		assert.ok(body.resources.includes('offersV2.listings.merchantInfo'));
		assert.ok(body.resources.includes('offersV2.listings.availability'));
	});

	test('represents an unavailable item without an offer as out of stock', async () => {
		const response = itemResponse({ offersV2: { listings: [] } });
		const snapshot = await fetchAmazonSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			creatorsFetcher(response),
			{ ...baseConfig, credentialId: 'unavailable-test' }
		);

		assert.equal(snapshot.availability, 'out_of_stock');
		assert.equal(snapshot.currentPrice, null);
		assert.equal(snapshot.sellerId, null);
	});

	test('rejects shortened links that do not provide a verifiable ASIN', async () => {
		await assert.rejects(
			fetchAmazonSnapshot(
				new URL('https://www.amazon.in/gp/aw/d/not-an-asin'),
				creatorsFetcher(itemResponse()),
				baseConfig
			),
			(error: unknown) => error instanceof MarketplaceFetchError && error.status === 422
		);
	});

	test('rejects invalid price and currency data', async () => {
		await assert.rejects(
			fetchAmazonSnapshot(
				new URL('https://www.amazon.in/dp/B000000001'),
				creatorsFetcher(itemResponse({}, { price: { money: { amount: -1, currency: 'rupees' } } })),
				{ ...baseConfig, credentialId: 'invalid-offer-test' }
			),
			(error: unknown) => error instanceof MarketplaceFetchError && error.status === 502
		);
	});

	test('normalizes Creators API throttling for tracker backoff', async () => {
		const fetcher = (async (input: URL | RequestInfo) => {
			if (input.toString().includes('/auth/o2/token')) {
				return jsonResponse({ access_token: 'throttled-token', expires_in: 3600 });
			}
			return jsonResponse({ message: 'rate limited' }, 429);
		}) as typeof fetch;

		await assert.rejects(
			fetchAmazonSnapshot(new URL('https://www.amazon.in/dp/B000000001'), fetcher, {
				...baseConfig,
				credentialId: 'throttle-test'
			}),
			(error: unknown) =>
				error instanceof MarketplaceFetchError &&
				error.status === 429 &&
				/Prizen will retry later/.test(error.message)
		);
	});

	test('requires owner-managed credentials and a marketplace partner tag', async () => {
		await assert.rejects(
			fetchAmazonSnapshot(
				new URL('https://www.amazon.com/dp/B000000001'),
				creatorsFetcher(itemResponse()),
				{ ...baseConfig, partnerTagUnitedStates: undefined }
			),
			(error: unknown) => error instanceof MarketplaceFetchError && error.status === 503
		);
	});
});
