import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fetchAmazonSnapshot } from './amazon';

function amazonResponse(html: string) {
	const response = new Response(html, { status: 200 });
	Object.defineProperty(response, 'url', { value: 'https://www.amazon.in/dp/B000000001' });
	return response;
}

describe('Amazon availability parsing', () => {
	test('ignores out-of-stock text outside the primary availability area', async () => {
		const html = `
			<html>
				<head><meta property="og:title" content="Available product"></head>
				<body>
					<div id="availability"><span>In stock</span></div>
					<span class="a-price-whole">1,299</span>
					<div class="recommendation">Another item is currently unavailable</div>
				</body>
			</html>`;

		const snapshot = await fetchAmazonSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			async () => amazonResponse(html)
		);

		assert.equal(snapshot.availability, 'in_stock');
	});

	test('detects an unavailable primary product without a current price', async () => {
		const html = `
			<html>
				<head><meta property="og:title" content="Unavailable product"></head>
				<body><div id="availability"><span>Currently unavailable.</span></div></body>
			</html>`;

		const snapshot = await fetchAmazonSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			async () => amazonResponse(html)
		);

		assert.equal(snapshot.availability, 'out_of_stock');
		assert.equal(snapshot.currentPrice, null);
	});

	test('prefers primary in-stock status over contradictory secondary markup', async () => {
		const html = `
			<html>
				<head><meta property="og:title" content="Available product"></head>
				<body>
					<div id="availability"><span>In stock</span></div>
					<div id="buybox">A different offer is out of stock</div>
					<span class="a-price-whole">2,499</span>
				</body>
			</html>`;

		const snapshot = await fetchAmazonSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			async () => amazonResponse(html)
		);

		assert.equal(snapshot.availability, 'in_stock');
	});

	test('applies an Amazon India delivery pincode before parsing availability', async () => {
		const productHtml = `
			<html><head><meta property="og:title" content="Located product"></head>
			<body><input name="anti-csrftoken-a2z" value="token"><div id="availability">In stock</div>
			<span class="a-price-whole">999</span></body></html>`;
		const requests: { url: string; body?: string }[] = [];
		const fetcher = async (input: URL | RequestInfo, init?: RequestInit) => {
			const url = input.toString();
			requests.push({ url, body: init?.body?.toString() });
			if (url.includes('address-change')) {
				const response = new Response('{}', {
					status: 200,
					headers: { 'set-cookie': 'location=ok' }
				});
				Object.defineProperty(response, 'url', { value: url });
				return response;
			}
			return amazonResponse(productHtml);
		};

		const snapshot = await fetchAmazonSnapshot(
			new URL('https://www.amazon.in/dp/B000000001'),
			fetcher as typeof fetch,
			'560001'
		);

		assert.equal(snapshot.availability, 'in_stock');
		assert.equal(requests.length, 3);
		assert.match(requests[1].body ?? '', /zipCode=560001/);
	});
});
