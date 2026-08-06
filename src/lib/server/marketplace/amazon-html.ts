import { MarketplaceFetchError, isAmazonUrl, type AmazonProductSnapshot } from './amazon';

const requestTimeoutMs = 15_000;

function getMeta(html: string, key: string) {
	for (const tag of html.matchAll(/<meta\s+[^>]*>/gi)) {
		const name = tag[0].match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
		const content = tag[0].match(/content=["']([^"']+)["']/i)?.[1];
		if (name?.toLowerCase() === key.toLowerCase() && content) return content;
	}
}

function parsePrice(value: string | undefined) {
	const match = value?.replaceAll(',', '').match(/([0-9]+(?:\.\d{1,2})?)/)?.[1];
	return match ? Number(match) : undefined;
}

function decodeHtml(value: string) {
	return value
		.replaceAll('&amp;', '&')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'")
		.replaceAll('&nbsp;', ' ')
		.replace(/<[^>]*>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function findTitle(html: string) {
	return (
		getMeta(html, 'og:title') ??
		html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
		html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
	);
}

function findPrice(html: string) {
	const candidates = [
		getMeta(html, 'product:price:amount'),
		html.match(
			/data-a-color=["']price["'][\s\S]{0,500}?<span[^>]+class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i
		)?.[1],
		html.match(/<span[^>]+class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1],
		html.match(/"priceAmount"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1],
		html.match(/"price"\s*:\s*"?([0-9,]+(?:\.[0-9]+)?)"?/i)?.[1]
	];
	for (const candidate of candidates) {
		const price = parsePrice(decodeHtml(candidate ?? ''));
		if (price !== undefined) return price;
	}
}

function findElementTextById(html: string, id: string) {
	const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const openingTag = new RegExp(`<([a-z][a-z0-9]*)[^>]*\\bid=["']${escapedId}["'][^>]*>`, 'i').exec(
		html
	);
	if (!openingTag || openingTag.index === undefined) return;
	const contentStart = openingTag.index + openingTag[0].length;
	const closingTag = new RegExp(`</${openingTag[1]}\\s*>`, 'i').exec(html.slice(contentStart));
	const contentEnd = closingTag ? contentStart + closingTag.index : contentStart + 2_000;
	return decodeHtml(html.slice(contentStart, contentEnd));
}

function findAvailability(html: string, currentPrice: number | undefined) {
	const unavailable = /currently unavailable|temporarily out of stock|\bout of stock\b/i;
	const available = /\bin stock\b|available to ship|add to cart|buy now/i;
	const primaryAvailability = findElementTextById(html, 'availability');
	if (primaryAvailability && available.test(primaryAvailability)) return 'in_stock' as const;
	if (primaryAvailability && unavailable.test(primaryAvailability)) return 'out_of_stock' as const;
	const explicitOutOfStock = findElementTextById(html, 'outOfStock');
	if (explicitOutOfStock && unavailable.test(explicitOutOfStock)) return 'out_of_stock' as const;
	const purchaseArea = ['availability_feature_div', 'buybox']
		.map((id) => findElementTextById(html, id))
		.filter((value): value is string => Boolean(value))
		.join(' ');
	if (available.test(purchaseArea)) return 'in_stock' as const;
	return currentPrice === undefined ? undefined : ('in_stock' as const);
}

function canonicalUrl(url: URL) {
	const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1];
	return asin ? new URL(`/dp/${asin}`, url.origin) : url;
}

/**
 * Unofficial bounded HTML mode for personal installations. It makes one normal
 * product-page request and never calls private endpoints or evades challenges.
 */
export async function fetchAmazonHtmlSnapshot(
	input: URL,
	fetcher: typeof fetch
): Promise<AmazonProductSnapshot> {
	const url = canonicalUrl(input);
	let response: Response;
	try {
		response = await fetcher(url, {
			headers: {
				'user-agent': 'Prizen/1.0 (self-hosted personal price tracker)',
				'accept-language': 'en-IN,en;q=0.9'
			},
			signal: AbortSignal.timeout(requestTimeoutMs)
		});
	} catch {
		throw new MarketplaceFetchError(
			'Prizen could not reach this product page. Try again shortly.',
			502
		);
	}
	if (!response.ok || !isAmazonUrl(new URL(response.url))) {
		throw new MarketplaceFetchError('Amazon did not return a product page for this link.', 502);
	}
	const html = await response.text();
	if (/captcha|robot check|enter the characters you see below/i.test(html)) {
		throw new MarketplaceFetchError(
			'Amazon temporarily rate-limited this tracker. Prizen will retry later.',
			429
		);
	}
	const title = findTitle(html);
	const currentPrice = findPrice(html);
	const availability = findAvailability(html, currentPrice);
	if (!title || availability === undefined) {
		throw new MarketplaceFetchError(
			'Prizen could not read a product name and price from this page.',
			502
		);
	}
	const asin = canonicalUrl(input).pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] ?? '';
	return {
		asin,
		parentAsin: null,
		variantId: asin,
		title: decodeHtml(title),
		url: response.url,
		currentPrice: currentPrice ?? null,
		currency:
			getMeta(html, 'product:price:currency') ??
			(url.hostname.endsWith('amazon.in') ? 'INR' : 'USD'),
		availability,
		sellerId: null,
		sellerName: null,
		deliveryContext: 'marketplace_default'
	};
}
