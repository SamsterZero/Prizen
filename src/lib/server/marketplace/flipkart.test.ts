import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fetchFlipkartSnapshot, FlipkartAdapter } from './flipkart';
import { MarketplaceFetchError } from './errors';

const config = { affiliateId: 'owner-id', affiliateToken: 'owner-token' };

function response(overrides: Record<string, unknown> = {}) {
	return new Response(
		JSON.stringify({
			productBaseInfoV1: {
				productId: 'MOBABC123456',
				title: 'Example phone',
				productUrl:
					'https://www.flipkart.com/example-phone/p/itm123?pid=MOBABC123456&affid=someone',
				flipkartSellingPrice: { amount: 12999, currency: 'INR' },
				maximumRetailPrice: { amount: 14999, currency: 'INR' },
				inStock: true,
				...overrides
			}
		}),
		{ status: 200 }
	);
}

describe('Flipkart Affiliate API adapter', () => {
	test('implements the shared contract with owner-managed credentials', async () => {
		const requests: Array<{ url: string; headers: Headers }> = [];
		const adapter = new FlipkartAdapter(config, (async (input, init) => {
			requests.push({ url: input.toString(), headers: new Headers(init?.headers) });
			return response();
		}) as typeof fetch);
		const url = new URL(
			'https://www.flipkart.com/example-phone/p/itm123?pid=MOBABC123456&utm_source=test'
		);

		assert.equal(adapter.canHandle(url), true);
		assert.equal(adapter.slug, 'flipkart');
		assert.deepEqual(adapter.capabilities, new Set(['product_tracking']));
		const product = await adapter.fetchProduct(url);
		assert.equal(product.externalId, 'MOBABC123456');
		assert.equal(product.currency, 'INR');
		assert.equal(product.url, 'https://www.flipkart.com/example-phone/p/itm123?pid=MOBABC123456');
		assert.equal(requests[0]?.headers.get('Fk-Affiliate-Id'), config.affiliateId);
		assert.equal(requests[0]?.headers.get('Fk-Affiliate-Token'), config.affiliateToken);
		assert.equal(new URL(requests[0]?.url ?? '').searchParams.get('id'), 'MOBABC123456');
	});

	test('keeps canonical identity stable when tracking parameters differ', async () => {
		const fetcher = (async () => response()) as typeof fetch;
		const first = await fetchFlipkartSnapshot(
			new URL('https://www.flipkart.com/example/p/itm123?pid=MOBABC123456&affid=one'),
			fetcher,
			config
		);
		const second = await fetchFlipkartSnapshot(
			new URL('https://www.flipkart.com/example/p/itm123?otracker=two&pid=MOBABC123456'),
			fetcher,
			config
		);

		assert.equal(first.productId, second.productId);
		assert.equal(first.url, second.url);
		assert.equal(first.currency, 'INR');
		assert.equal(first.currentPrice, 12999);
	});

	test('isolates throttling and invalid currency failures', async () => {
		await assert.rejects(
			fetchFlipkartSnapshot(
				new URL('https://www.flipkart.com/example/p/itm123?pid=MOBABC123456'),
				(async () => new Response(null, { status: 429 })) as typeof fetch,
				config
			),
			(error: unknown) => error instanceof MarketplaceFetchError && error.status === 429
		);
		await assert.rejects(
			fetchFlipkartSnapshot(
				new URL('https://www.flipkart.com/example/p/itm123?pid=MOBABC123456'),
				(async () =>
					response({ flipkartSellingPrice: { amount: 12999, currency: 'USD' } })) as typeof fetch,
				config
			),
			(error: unknown) => error instanceof MarketplaceFetchError && /non-INR/.test(error.message)
		);
	});
});
