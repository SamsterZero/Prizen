const allowedHosts = new Set(['amazon.in', 'www.amazon.in', 'amazon.com', 'www.amazon.com']);
const requestTimeoutMs = 15_000;
const creatorsApiUrl = 'https://creatorsapi.amazon/catalog/v1/getItems';

const tokenEndpoints: Record<string, string> = {
	'3.1': 'https://api.amazon.com/auth/o2/token',
	'3.2': 'https://api.amazon.co.uk/auth/o2/token',
	'3.3': 'https://api.amazon.co.jp/auth/o2/token'
};

export type AmazonCreatorsConfig = {
	credentialId: string;
	credentialSecret: string;
	credentialVersion: string;
	partnerTagIndia?: string;
	partnerTagUnitedStates?: string;
};

export type AmazonProductSnapshot = {
	asin: string;
	parentAsin: string | null;
	variantId: string;
	title: string;
	url: string;
	currentPrice: number | null;
	currency: string;
	availability: 'in_stock' | 'out_of_stock';
	sellerId: string | null;
	sellerName: string | null;
	deliveryContext: 'marketplace_default';
};

export class MarketplaceFetchError extends Error {
	constructor(
		message: string,
		readonly status: 422 | 429 | 502 | 503
	) {
		super(message);
	}
}

type AccessToken = { value: string; expiresAt: number };
const tokenCache = new Map<string, AccessToken>();

type CreatorsApiResponse = {
	errors?: { code?: string; message?: string }[];
	itemsResult?: {
		items?: Array<{
			asin?: string;
			parentASIN?: string;
			detailPageURL?: string;
			itemInfo?: { title?: { displayValue?: string } };
			offersV2?: {
				listings?: Array<{
					isBuyBoxWinner?: boolean;
					availability?: { type?: string; message?: string };
					merchantInfo?: { id?: string; name?: string };
					price?: { money?: { amount?: number; currency?: string } };
				}>;
			};
		}>;
	};
};

function productAsin(url: URL) {
	return url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase();
}

function marketplaceFor(url: URL) {
	return url.hostname.endsWith('amazon.in') ? 'www.amazon.in' : 'www.amazon.com';
}

function partnerTagFor(marketplace: string, config: AmazonCreatorsConfig) {
	return marketplace === 'www.amazon.in' ? config.partnerTagIndia : config.partnerTagUnitedStates;
}

function normalizedAvailability(type: string | undefined) {
	return type === 'IN_STOCK' || type === 'IN_STOCK_SCARCE'
		? ('in_stock' as const)
		: ('out_of_stock' as const);
}

function marketplaceError(status: number, operation: 'authenticate with' | 'query') {
	if (status === 429) {
		return new MarketplaceFetchError(
			`Amazon Creators API throttled this tracker while trying to ${operation}. Prizen will retry later.`,
			429
		);
	}
	return new MarketplaceFetchError(
		`Amazon Creators API could not ${operation === 'query' ? 'return this product' : 'authenticate this installation'}. Check the owner-managed Amazon configuration.`,
		502
	);
}

async function accessToken(config: AmazonCreatorsConfig, fetcher: typeof fetch) {
	const tokenEndpoint = tokenEndpoints[config.credentialVersion];
	if (!tokenEndpoint) {
		throw new MarketplaceFetchError(
			'The saved Creators API credential version must be 3.1, 3.2, or 3.3.',
			503
		);
	}
	const cacheKey = `${config.credentialId}:${config.credentialVersion}`;
	const cached = tokenCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

	let response: Response;
	try {
		response = await fetcher(tokenEndpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				grant_type: 'client_credentials',
				client_id: config.credentialId,
				client_secret: config.credentialSecret,
				scope: 'creatorsapi::default'
			}),
			signal: AbortSignal.timeout(requestTimeoutMs)
		});
	} catch {
		throw new MarketplaceFetchError(
			'Prizen could not reach the Amazon Creators API authentication service.',
			502
		);
	}
	if (!response.ok) throw marketplaceError(response.status, 'authenticate with');
	const payload = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
	if (typeof payload.access_token !== 'string' || payload.access_token.length === 0) {
		throw new MarketplaceFetchError(
			'Amazon Creators API returned an invalid authentication response.',
			502
		);
	}
	const expiresIn =
		typeof payload.expires_in === 'number' && payload.expires_in > 0 ? payload.expires_in : 3600;
	tokenCache.set(cacheKey, {
		value: payload.access_token,
		expiresAt: Date.now() + expiresIn * 1000
	});
	return payload.access_token;
}

export function isAmazonUrl(url: URL) {
	return url.protocol === 'https:' && allowedHosts.has(url.hostname);
}

export async function fetchAmazonSnapshot(
	input: URL,
	fetcher: typeof fetch,
	config: AmazonCreatorsConfig
): Promise<AmazonProductSnapshot> {
	const asin = productAsin(input);
	if (!asin) {
		throw new MarketplaceFetchError(
			'Use a direct Amazon product URL containing a 10-character ASIN.',
			422
		);
	}
	const marketplace = marketplaceFor(input);
	const partnerTag = partnerTagFor(marketplace, config);
	if (
		!config.credentialId ||
		!config.credentialSecret ||
		!config.credentialVersion ||
		!partnerTag
	) {
		throw new MarketplaceFetchError(
			`Amazon Creators API is not configured for ${marketplace}.`,
			503
		);
	}
	const token = await accessToken(config, fetcher);
	let response: Response;
	try {
		response = await fetcher(creatorsApiUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-marketplace': marketplace,
				authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				itemIds: [asin],
				itemIdType: 'ASIN',
				marketplace,
				partnerTag,
				resources: [
					'itemInfo.title',
					'parentASIN',
					'offersV2.listings.availability',
					'offersV2.listings.isBuyBoxWinner',
					'offersV2.listings.merchantInfo',
					'offersV2.listings.price'
				]
			}),
			signal: AbortSignal.timeout(requestTimeoutMs)
		});
	} catch {
		throw new MarketplaceFetchError('Prizen could not reach Amazon Creators API.', 502);
	}
	if (!response.ok) throw marketplaceError(response.status, 'query');
	const payload = (await response.json()) as CreatorsApiResponse;
	const item = payload.itemsResult?.items?.find((candidate) => candidate.asin === asin);
	if (!item) {
		const reason = payload.errors?.[0]?.message;
		throw new MarketplaceFetchError(
			reason
				? `Amazon Creators API rejected this product: ${reason}`
				: 'Amazon did not return this product.',
			502
		);
	}
	const title = item.itemInfo?.title?.displayValue?.trim();
	const listing =
		item.offersV2?.listings?.find((candidate) => candidate.isBuyBoxWinner) ??
		item.offersV2?.listings?.[0];
	const price = listing?.price?.money?.amount;
	const currency = listing?.price?.money?.currency;
	if (!title || (price !== undefined && (!Number.isFinite(price) || price <= 0))) {
		throw new MarketplaceFetchError('Amazon returned invalid product or offer data.', 502);
	}
	if (price !== undefined && (!currency || !/^[A-Z]{3}$/.test(currency))) {
		throw new MarketplaceFetchError('Amazon returned an invalid offer currency.', 502);
	}
	return {
		asin,
		parentAsin: item.parentASIN ?? null,
		variantId: asin,
		title,
		url: item.detailPageURL ?? new URL(`/dp/${asin}`, input.origin).toString(),
		currentPrice: price ?? null,
		currency: currency ?? (marketplace === 'www.amazon.in' ? 'INR' : 'USD'),
		availability: normalizedAvailability(listing?.availability?.type),
		sellerId: listing?.merchantInfo?.id ?? null,
		sellerName: listing?.merchantInfo?.name ?? null,
		deliveryContext: 'marketplace_default'
	};
}
