import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MarketplaceFetchError } from './errors';
import { fetchFlipkartHtmlSnapshot } from './flipkart-html';

const url = new URL('https://www.flipkart.com/example/p/itm123?pid=MOBABC123456&utm_source=x');

function page(html: string) {
	const response = new Response(html, { status: 200 });
	Object.defineProperty(response, 'url', { value: url.toString() });
	return response;
}

describe('Flipkart bounded HTML adapter', () => {
	test('reads public JSON-LD product data in one request', async () => {
		let calls = 0;
		const snapshot = await fetchFlipkartHtmlSnapshot(url, (async () => {
			calls += 1;
			return page(
				`<script type="application/ld+json">${JSON.stringify({
					'@type': 'Product',
					name: 'Example phone',
					offers: {
						price: '12,999',
						priceCurrency: 'INR',
						availability: 'https://schema.org/InStock'
					}
				})}</script>`
			);
		}) as typeof fetch);
		assert.equal(calls, 1);
		assert.equal(snapshot.productId, 'MOBABC123456');
		assert.equal(snapshot.currentPrice, 12999);
		assert.equal(snapshot.currency, 'INR');
		assert.equal(snapshot.url, 'https://www.flipkart.com/example/p/itm123?pid=MOBABC123456');
	});

	test('does not try to evade challenge pages', async () => {
		await assert.rejects(
			fetchFlipkartHtmlSnapshot(url, (async () =>
				page('<title>Verify you are human</title>')) as typeof fetch),
			(error: unknown) => error instanceof MarketplaceFetchError && error.status === 429
		);
	});
});
