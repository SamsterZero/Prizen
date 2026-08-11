import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	analyticsDateToISOString,
	calculatePriceAnalytics,
	parseAnalyticsRange
} from './analytics';

describe('price analytics', () => {
	test('represents empty and sparse histories without inventing trends', () => {
		assert.equal(calculatePriceAnalytics([]).currentPrice, null);
		const single = calculatePriceAnalytics([{ price: 100, observedAt: '2026-01-01T00:00:00Z' }]);
		assert.equal(single.changePercent, null);
		assert.equal(single.volatilityPercent, null);
		assert.equal(single.observationCount, 1);
	});

	test('calculates change and normalized volatility in chronological order', () => {
		const analytics = calculatePriceAnalytics([
			{ price: 90, observedAt: '2026-01-03T00:00:00Z' },
			{ price: 100, observedAt: '2026-01-01T00:00:00Z' },
			{ price: 110, observedAt: '2026-01-02T00:00:00Z' }
		]);
		assert.equal(analytics.currentPrice, 90);
		assert.equal(analytics.lowestPrice, 90);
		assert.equal(analytics.highestPrice, 110);
		assert.equal(analytics.changePercent, -10);
		assert.ok((analytics.volatilityPercent ?? 0) > 8);
	});

	test('falls back to a bounded default range', () => {
		assert.equal(parseAnalyticsRange('7d'), '7d');
		assert.equal(parseAnalyticsRange('all'), '30d');
		assert.equal(parseAnalyticsRange(null), '30d');
	});

	test('normalizes database timestamp strings and Date instances', () => {
		assert.equal(analyticsDateToISOString('2026-01-01 12:00:00+00'), '2026-01-01T12:00:00.000Z');
		assert.equal(
			analyticsDateToISOString(new Date('2026-01-01T12:00:00Z')),
			'2026-01-01T12:00:00.000Z'
		);
	});
});
