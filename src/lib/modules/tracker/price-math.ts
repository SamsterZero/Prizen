export type PriceInsight = {
	change: number | null;
	changePercent: number | null;
	isNewLow: boolean;
	targetReached: boolean;
};

export function calculatePriceInsight(input: {
	current: number;
	previous?: number;
	historicalLow?: number;
	target?: number;
}): PriceInsight {
	const previous = input.previous;
	const change = previous === undefined ? null : input.current - previous;
	return {
		change,
		changePercent:
			previous === undefined || previous === 0
				? null
				: ((input.current - previous) / previous) * 100,
		isNewLow: input.historicalLow !== undefined && input.current <= input.historicalLow,
		targetReached: input.target !== undefined && input.current <= input.target
	};
}
