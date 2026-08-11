import type {
	MarketplaceAdapter,
	MarketplacePrice,
	MarketplaceProduct
} from '$lib/modules/marketplace/contracts';
import { MarketplaceFetchError } from './errors';

const allowedHosts = new Set(['flipkart.com', 'www.flipkart.com']);
const productApiUrl = 'https://affiliate-api.flipkart.net/affiliate/1.0/product.json';
const requestTimeoutMs = 15_000;

export type FlipkartAffiliateConfig = {
	affiliateId: string;
	affiliateToken: string;
};

export type FlipkartProductSnapshot = {
	productId: string;
	title: string;
	url: string;
	currentPrice: number | null;
	listPrice: number | null;
	currency: 'INR';
	availability: 'in_stock' | 'out_of_stock';
	deliveryContext: 'marketplace_default';
};

type Money = { amount?: unknown; currency?: unknown };
type ProductAttributes = {
	title?: unknown;
	productUrl?: unknown;
	sellingPrice?: Money;
	maximumRetailPrice?: Money;
	inStock?: unknown;
};
type ProductBase = {
	productIdentifier?: { productId?: unknown };
	productAttributes?: ProductAttributes;
};
type ProductBaseV1 = ProductAttributes & {
	productId?: unknown;
	flipkartSellingPrice?: Money;
	flipkartSpecialPrice?: Money;
};

export function isFlipkartUrl(url: URL) {
	return url.protocol === 'https:' && allowedHosts.has(url.hostname);
}

export function flipkartProductId(url: URL) {
	const productId = url.searchParams.get('pid')?.trim().toUpperCase();
	return productId && /^[A-Z0-9]{8,32}$/.test(productId) ? productId : undefined;
}

function money(value: Money | undefined, field: string) {
	if (!value) return null;
	if (typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0) {
		throw new MarketplaceFetchError(`Flipkart returned an invalid ${field}.`, 502);
	}
	if (value.currency !== 'INR') {
		throw new MarketplaceFetchError('Flipkart returned a non-INR product price.', 502);
	}
	return value.amount;
}

function canonicalUrl(input: URL, productId: string, returnedUrl: unknown) {
	let result = input;
	if (typeof returnedUrl === 'string') {
		try {
			const candidate = new URL(returnedUrl);
			if (isFlipkartUrl(candidate)) result = candidate;
		} catch {
			/* Keep the validated input URL when the API URL is malformed. */
		}
	}
	result = new URL(result.toString());
	result.protocol = 'https:';
	result.hostname = 'www.flipkart.com';
	result.search = '';
	result.searchParams.set('pid', productId);
	result.hash = '';
	return result.toString();
}

function responseError(status: number) {
	if (status === 429) {
		return new MarketplaceFetchError(
			'Flipkart Affiliate API throttled this tracker. Prizen will retry later.',
			429
		);
	}
	if (status === 401 || status === 403) {
		return new MarketplaceFetchError(
			'Flipkart rejected the owner-managed Affiliate API credentials.',
			503
		);
	}
	return new MarketplaceFetchError('Flipkart Affiliate API could not return this product.', 502);
}

export async function fetchFlipkartSnapshot(
	input: URL,
	fetcher: typeof fetch,
	config: FlipkartAffiliateConfig
): Promise<FlipkartProductSnapshot> {
	if (!isFlipkartUrl(input)) throw new MarketplaceFetchError('Use a Flipkart product URL.', 422);
	const requestedProductId = flipkartProductId(input);
	if (!requestedProductId) {
		throw new MarketplaceFetchError('Use a Flipkart product URL containing a valid pid.', 422);
	}
	if (!config.affiliateId || !config.affiliateToken) {
		throw new MarketplaceFetchError('Configure Flipkart Affiliate API credentials first.', 503);
	}

	const endpoint = new URL(productApiUrl);
	endpoint.searchParams.set('id', requestedProductId);
	let response: Response;
	try {
		response = await fetcher(endpoint, {
			headers: {
				'Fk-Affiliate-Id': config.affiliateId,
				'Fk-Affiliate-Token': config.affiliateToken
			},
			signal: AbortSignal.timeout(requestTimeoutMs)
		});
	} catch {
		throw new MarketplaceFetchError('Prizen could not reach Flipkart Affiliate API.', 502);
	}
	if (!response.ok) throw responseError(response.status);

	const payload = (await response.json()) as {
		productBaseInfo?: ProductBase;
		productBaseInfoV1?: ProductBaseV1;
	};
	const legacyBase = payload.productBaseInfo;
	const currentBase = payload.productBaseInfoV1;
	const attributes: ProductAttributes | undefined = currentBase
		? {
				title: currentBase.title,
				productUrl: currentBase.productUrl,
				sellingPrice: currentBase.flipkartSpecialPrice ?? currentBase.flipkartSellingPrice,
				maximumRetailPrice: currentBase.maximumRetailPrice,
				inStock: currentBase.inStock
			}
		: legacyBase?.productAttributes;
	const productId = currentBase?.productId ?? legacyBase?.productIdentifier?.productId;
	if (typeof productId !== 'string' || productId.toUpperCase() !== requestedProductId) {
		throw new MarketplaceFetchError('Flipkart returned a different product identity.', 502);
	}
	if (typeof attributes?.title !== 'string' || !attributes.title.trim()) {
		throw new MarketplaceFetchError('Flipkart returned invalid product data.', 502);
	}
	const currentPrice = money(attributes.sellingPrice, 'selling price');
	const listPrice = money(attributes.maximumRetailPrice, 'list price');
	const inStock = attributes.inStock === true;
	if (inStock && currentPrice === null) {
		throw new MarketplaceFetchError('Flipkart omitted the price of an in-stock product.', 502);
	}

	return {
		productId: requestedProductId,
		title: attributes.title.trim(),
		url: canonicalUrl(input, requestedProductId, attributes.productUrl),
		currentPrice,
		listPrice,
		currency: 'INR',
		availability: inStock ? 'in_stock' : 'out_of_stock',
		deliveryContext: 'marketplace_default'
	};
}

export class FlipkartAdapter implements MarketplaceAdapter {
	readonly slug = 'flipkart';
	readonly capabilities = new Set(['product_tracking'] as const);

	constructor(
		private readonly config: FlipkartAffiliateConfig,
		private readonly fetcher: typeof fetch = fetch
	) {}

	canHandle(url: URL) {
		return isFlipkartUrl(url) && Boolean(flipkartProductId(url));
	}

	private snapshot(url: URL) {
		return fetchFlipkartSnapshot(url, this.fetcher, this.config);
	}

	async fetchProduct(url: URL): Promise<MarketplaceProduct> {
		const snapshot = await this.snapshot(url);
		return {
			externalId: snapshot.productId,
			title: snapshot.title,
			url: snapshot.url,
			currency: snapshot.currency
		};
	}

	async fetchPrice(url: URL): Promise<MarketplacePrice> {
		const snapshot = await this.snapshot(url);
		if (snapshot.currentPrice === null) {
			throw new MarketplaceFetchError('Flipkart product is currently unavailable.', 422);
		}
		return {
			price: snapshot.currentPrice,
			listPrice: snapshot.listPrice ?? undefined,
			currency: snapshot.currency,
			availability: snapshot.availability,
			observedAt: new Date()
		};
	}
}
