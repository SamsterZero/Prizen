import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calculatePriceInsight } from './price-math';

describe('tracker price decisions', () => {
	test('detects record lows and target crossings', () => {
		assert.deepEqual(
			calculatePriceInsight({ current: 900, previous: 1_000, historicalLow: 950, target: 925 }),
			{
				change: -100,
				changePercent: -10,
				isNewLow: true,
				targetReached: true
			}
		);
	});

	test('does not produce a percentage without a valid previous price', () => {
		const insight = calculatePriceInsight({ current: 500, previous: 0 });
		assert.equal(insight.changePercent, null);
		assert.equal(insight.isNewLow, false);
		assert.equal(insight.targetReached, false);
	});
});
