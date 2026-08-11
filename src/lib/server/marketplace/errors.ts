export class MarketplaceFetchError extends Error {
	constructor(
		message: string,
		readonly status: 422 | 429 | 502 | 503
	) {
		super(message);
	}
}
