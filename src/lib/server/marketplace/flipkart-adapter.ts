import { MarketplaceFetchError } from './errors';
import { fetchFlipkartHtmlSnapshot } from './flipkart-html';
import {
	fetchFlipkartSnapshot as fetchFlipkartAffiliateSnapshot,
	type FlipkartAffiliateConfig
} from './flipkart';

export type FlipkartDataSource = 'html' | 'affiliate-api';

export function fetchFlipkartSnapshot(
	input: URL,
	fetcher: typeof fetch,
	options: { dataSource?: string; affiliate: FlipkartAffiliateConfig }
) {
	const dataSource = options.dataSource || 'html';
	if (dataSource === 'html') return fetchFlipkartHtmlSnapshot(input, fetcher);
	if (dataSource === 'affiliate-api') {
		return fetchFlipkartAffiliateSnapshot(input, fetcher, options.affiliate);
	}
	throw new MarketplaceFetchError(
		'The saved Flipkart data source must be either HTML or Affiliate API.',
		503
	);
}
