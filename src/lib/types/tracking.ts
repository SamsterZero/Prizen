import type { AnalyticsRange, PriceAnalytics } from '$lib/modules/tracker/analytics';

export type Observation = { price: number; observedAt: string };

export type TrackedProduct = {
	id: string;
	title: string;
	url: string;
	currency: string;
	history: Observation[];
	analytics: PriceAnalytics;
	analyticsRange: AnalyticsRange;
	marketplace: { slug: string; name: string };
	pollingSeconds: number;
	createdAt: string;
	targetPrice: number | null;
	availability: 'in_stock' | 'out_of_stock' | 'unknown';
	failureCount: number;
};

export const pollingOptions = [
	{ seconds: 15, label: '15 s' },
	{ seconds: 30, label: '30 s' },
	{ seconds: 60, label: '1 min' },
	{ seconds: 300, label: '5 mins' },
	{ seconds: 900, label: '15 mins' },
	{ seconds: 1800, label: '30 mins' },
	{ seconds: 3600, label: '1 hr' }
];
