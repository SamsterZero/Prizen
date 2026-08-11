import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { backupHealth, formatAge, formatCount, trackerHealth } from './health';

const now = new Date('2026-08-11T12:00:00.000Z');

describe('operations health thresholds', () => {
	test('classifies tracker heartbeat age without inventing unknown success', () => {
		assert.equal(trackerHealth(null, now), 'unknown');
		assert.equal(trackerHealth('2026-08-11T11:59:00.000Z', now), 'healthy');
		assert.equal(trackerHealth('2026-08-11T11:57:00.000Z', now), 'warning');
		assert.equal(trackerHealth('2026-08-11T11:50:00.000Z', now), 'critical');
	});

	test('classifies backup freshness and formats age', () => {
		assert.equal(backupHealth(null, now), 'unknown');
		assert.equal(backupHealth('2026-08-11T00:00:00.000Z', now), 'healthy');
		assert.equal(backupHealth('2026-08-09T12:00:00.000Z', now), 'warning');
		assert.equal(backupHealth('2026-08-01T12:00:00.000Z', now), 'critical');
		assert.equal(formatAge('2026-08-09T12:00:00.000Z', now), '2d ago');
	});

	test('formats large counts using compact units', () => {
		assert.equal(formatCount(999), '999');
		assert.equal(formatCount(1_000), '1K');
		assert.equal(formatCount(12_500), '12.5K');
		assert.equal(formatCount(2_300_000), '2.3M');
		assert.equal(formatCount(4_000_000_000), '4B');
	});
});
