export const analyticsRanges = {
	'24h': { label: '24 hours', milliseconds: 86_400_000, bucketMinutes: 15, pointLimit: 96 },
	'7d': { label: '7 days', milliseconds: 7 * 86_400_000, bucketMinutes: 60, pointLimit: 168 },
	'30d': { label: '30 days', milliseconds: 30 * 86_400_000, bucketMinutes: 180, pointLimit: 240 },
	'90d': { label: '90 days', milliseconds: 90 * 86_400_000, bucketMinutes: 360, pointLimit: 360 }
} as const;

export type AnalyticsRange = keyof typeof analyticsRanges;

export type PriceAnalytics = {
	currentPrice: number | null;
	firstPrice: number | null;
	lowestPrice: number | null;
	highestPrice: number | null;
	averagePrice: number | null;
	changePercent: number | null;
	volatilityPercent: number | null;
	observationCount: number;
	lastObservedAt: string | null;
};

export function parseAnalyticsRange(value: string | null): AnalyticsRange {
	return value !== null && value in analyticsRanges ? (value as AnalyticsRange) : '30d';
}

export function rangeCutoff(range: AnalyticsRange, now = Date.now()) {
	return new Date(now - analyticsRanges[range].milliseconds);
}

export function analyticsDateToISOString(value: Date | string | null | undefined) {
	if (value == null) return null;
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function calculatePriceAnalytics(
	observations: { price: number; observedAt: string }[]
): PriceAnalytics {
	const valid = observations.filter(
		(item) => Number.isFinite(item.price) && !Number.isNaN(new Date(item.observedAt).getTime())
	);
	if (valid.length === 0) {
		return {
			currentPrice: null,
			firstPrice: null,
			lowestPrice: null,
			highestPrice: null,
			averagePrice: null,
			changePercent: null,
			volatilityPercent: null,
			observationCount: 0,
			lastObservedAt: null
		};
	}

	const sorted = valid.toSorted(
		(a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
	);
	const prices = sorted.map((item) => item.price);
	const firstPrice = prices[0];
	const currentPrice = prices.at(-1)!;
	const averagePrice = prices.reduce((total, price) => total + price, 0) / prices.length;
	const variance =
		prices.length < 3
			? null
			: prices.reduce((total, price) => total + (price - averagePrice) ** 2, 0) / prices.length;

	return {
		currentPrice,
		firstPrice,
		lowestPrice: Math.min(...prices),
		highestPrice: Math.max(...prices),
		averagePrice,
		changePercent:
			prices.length < 2 || firstPrice === 0
				? null
				: ((currentPrice - firstPrice) / firstPrice) * 100,
		volatilityPercent:
			variance === null || averagePrice === 0 ? null : (Math.sqrt(variance) / averagePrice) * 100,
		observationCount: prices.length,
		lastObservedAt: sorted.at(-1)!.observedAt
	};
}
