import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fetchAmazonHtmlSnapshot } from './amazon-html';
import { MarketplaceFetchError } from './amazon';

function amazonResponse(html: string) {
	const response = new Response(html, { status: 200 });
	Object.defineProperty(response, 'url', { value: 'https://www.amazon.in/dp/B000000001' });
	return response;
}

describe('Amazon bounded HTML adapter', () => {
	test('reads a product page without credentials or private endpoint calls', async () => {
		const requests: string[] = [];
		const snapshot = await fetchAmazonHtmlSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			(async (input: URL | RequestInfo) => {
				requests.push(input.toString());
				return amazonResponse(`
					<html><head><meta property="og:title" content="Available product"></head>
					<body><div id="availability">In stock</div>
					<span class="a-price-whole">1,299</span></body></html>`);
			}) as typeof fetch
		);

		assert.equal(requests.length, 1);
		assert.equal(snapshot.currentPrice, 1299);
		assert.equal(snapshot.availability, 'in_stock');
		assert.equal(snapshot.sellerId, null);
	});

	test('detects an unavailable product without a current price', async () => {
		const snapshot = await fetchAmazonHtmlSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			(async () =>
				amazonResponse(`
					<html><head><meta property="og:title" content="Unavailable product"></head>
					<body><div id="availability">Currently unavailable.</div></body></html>`)) as typeof fetch
		);

		assert.equal(snapshot.availability, 'out_of_stock');
		assert.equal(snapshot.currentPrice, null);
	});

	test('does not attempt to evade challenge pages', async () => {
		await assert.rejects(
			fetchAmazonHtmlSnapshot(new URL('https://www.amazon.in/dp/B000000001'), (async () =>
				amazonResponse('<title>Robot Check</title>')) as typeof fetch),
			(error: unknown) => error instanceof MarketplaceFetchError && error.status === 429
		);
	});
});
