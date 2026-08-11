import { MarketplaceFetchError } from './errors';
import { flipkartProductId, isFlipkartUrl, type FlipkartProductSnapshot } from './flipkart';

const requestTimeoutMs = 15_000;

type JsonLdProduct = {
	'@type'?: unknown;
	'@graph'?: JsonLdProduct[];
	name?: unknown;
	offers?:
		| { price?: unknown; priceCurrency?: unknown; availability?: unknown; highPrice?: unknown }
		| Array<{
				price?: unknown;
				priceCurrency?: unknown;
				availability?: unknown;
				highPrice?: unknown;
		  }>;
};

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

function meta(html: string, key: string) {
	for (const tag of html.matchAll(/<meta\s+[^>]*>/gi)) {
		const name = tag[0].match(/(?:property|name|itemprop)=["']([^"']+)["']/i)?.[1];
		const content = tag[0].match(/content=["']([^"']+)["']/i)?.[1];
		if (name?.toLowerCase() === key.toLowerCase() && content) return decodeHtml(content);
	}
}

function jsonLdProduct(html: string) {
	for (const match of html.matchAll(
		/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
	)) {
		try {
			const parsed = JSON.parse(match[1]) as JsonLdProduct | JsonLdProduct[];
			const roots = Array.isArray(parsed) ? parsed : [parsed];
			const entries = roots.flatMap((entry) => [entry, ...(entry['@graph'] ?? [])]);
			const product = entries.find((entry) => entry['@type'] === 'Product');
			if (product) return product;
		} catch {
			/* Ignore unrelated malformed structured-data blocks. */
		}
	}
}

function numericPrice(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
	if (typeof value !== 'string') return null;
	const parsed = Number(value.replaceAll(',', '').replace(/[^0-9.]/g, ''));
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function pagePrice(html: string, offerPrice: unknown) {
	const candidates = [
		offerPrice,
		meta(html, 'product:price:amount'),
		html.match(/class=["'][^"']*(?:Nx9bqj|_30jeq3)[^"']*["'][^>]*>([^<]+)/i)?.[1],
		html.match(
			/"(?:sellingPrice|finalPrice)"\s*:\s*\{[^}]*"(?:amount|value)"\s*:\s*([0-9.]+)/i
		)?.[1],
		html.match(/"sellingPrice"\s*:\s*([0-9.]+)/i)?.[1]
	];
	for (const candidate of candidates) {
		const price = numericPrice(candidate);
		if (price !== null) return price;
	}
	return null;
}

function isChallengePage(html: string) {
	const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
	if (/captcha|verify you are human|access denied|unusual traffic/i.test(title)) return true;
	return /<(?:form|iframe)[^>]+(?:action|src)=["'][^"']*(?:captcha|challenge)[^"']*["']/i.test(
		html
	);
}

function canonicalUrl(input: URL, productId: string) {
	const url = new URL(input.toString());
	url.protocol = 'https:';
	url.hostname = 'www.flipkart.com';
	url.search = '';
	url.searchParams.set('pid', productId);
	url.hash = '';
	return url.toString();
}

/** One public product-page request; no private endpoints, browser impersonation, or challenge evasion. */
export async function fetchFlipkartHtmlSnapshot(
	input: URL,
	fetcher: typeof fetch
): Promise<FlipkartProductSnapshot> {
	const productId = flipkartProductId(input);
	if (!isFlipkartUrl(input) || !productId) {
		throw new MarketplaceFetchError('Use a Flipkart product URL containing a valid pid.', 422);
	}
	const url = canonicalUrl(input, productId);
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
		throw new MarketplaceFetchError('Prizen could not reach this Flipkart product page.', 502);
	}
	const finalUrl = response.url ? new URL(response.url) : new URL(url);
	if (response.status === 429) {
		throw new MarketplaceFetchError(
			'Flipkart temporarily blocked this product check. Prizen will retry later.',
			429
		);
	}
	if (!response.ok || !isFlipkartUrl(finalUrl)) {
		throw new MarketplaceFetchError('Flipkart did not return a product page for this link.', 502);
	}
	const html = await response.text();
	if (isChallengePage(html)) {
		throw new MarketplaceFetchError(
			'Flipkart temporarily blocked this product check. Prizen will retry later.',
			429
		);
	}
	const structured = jsonLdProduct(html);
	const offer = Array.isArray(structured?.offers) ? structured.offers[0] : structured?.offers;
	const title =
		(typeof structured?.name === 'string' ? structured.name : undefined) ??
		meta(html, 'og:title') ??
		html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
	const currentPrice = pagePrice(html, offer?.price);
	const listPrice = numericPrice(offer?.highPrice);
	const availabilityValue = typeof offer?.availability === 'string' ? offer.availability : '';
	const outOfStock = /outofstock|sold out|currently unavailable/i.test(
		`${availabilityValue} ${html.slice(0, 250_000)}`
	);
	if (!title || (!currentPrice && !outOfStock)) {
		throw new MarketplaceFetchError(
			'Prizen could not read a product name and price from this Flipkart page.',
			502
		);
	}
	const currency = offer?.priceCurrency ?? meta(html, 'product:price:currency') ?? 'INR';
	if (currency !== 'INR')
		throw new MarketplaceFetchError('Flipkart returned a non-INR price.', 502);
	return {
		productId,
		title: decodeHtml(title),
		url,
		currentPrice,
		listPrice,
		currency: 'INR',
		availability: outOfStock ? 'out_of_stock' : 'in_stock',
		deliveryContext: 'marketplace_default'
	};
}
