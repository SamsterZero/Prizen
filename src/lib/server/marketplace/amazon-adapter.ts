import {
	fetchAmazonSnapshot as fetchAmazonCreatorsSnapshot,
	isAmazonUrl,
	MarketplaceFetchError,
	type AmazonCreatorsConfig,
	type AmazonProductSnapshot
} from './amazon';
import { fetchAmazonHtmlSnapshot } from './amazon-html';

export { isAmazonUrl, MarketplaceFetchError };
export type { AmazonProductSnapshot };

export type AmazonDataSource = 'html' | 'creators';

export async function fetchAmazonSnapshot(
	input: URL,
	fetcher: typeof fetch,
	options: {
		dataSource?: string;
		creators: AmazonCreatorsConfig;
	}
) {
	const dataSource = options.dataSource || 'html';
	if (dataSource === 'html') return fetchAmazonHtmlSnapshot(input, fetcher);
	if (dataSource === 'creators') {
		return fetchAmazonCreatorsSnapshot(input, fetcher, options.creators);
	}
	throw new MarketplaceFetchError(
		'The saved Amazon data source must be either HTML or Creators API.',
		503
	);
}
