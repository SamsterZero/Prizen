import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { PurchaseCandidate, PurchasePolicy } from './contracts';
import { evaluatePurchase } from './policy';

const policy: PurchasePolicy = {
	mode: 'confirm',
	maxTotal: 1_000,
	currency: 'INR',
	quantity: 1,
	variantId: 'black-128',
	allowedSellerIds: ['trusted-seller'],
	requireMarketplaceFulfilment: true,
	expiresAt: '2026-08-06T12:05:00.000Z'
};

const candidate: PurchaseCandidate = {
	marketplace: 'amazon-in',
	externalId: 'B000000000',
	variantId: 'black-128',
	sellerId: 'trusted-seller',
	isMarketplaceFulfilled: true,
	quantity: 1,
	itemTotal: 900,
	deliveryTotal: 40,
	taxTotal: 10,
	currency: 'INR',
	availability: 'in_stock'
};

describe('purchase policy', () => {
	test('allows a matching candidate using the delivered total', () => {
		assert.deepEqual(evaluatePurchase(policy, candidate, new Date('2026-08-06T12:00:00.000Z')), {
			allowed: true,
			deliveredTotal: 950
		});
	});

	test('rejects a price that exceeds the limit after delivery and tax', () => {
		assert.deepEqual(
			evaluatePurchase(
				policy,
				{ ...candidate, deliveryTotal: 100, taxTotal: 50 },
				new Date('2026-08-06T12:00:00.000Z')
			),
			{ allowed: false, reason: 'price_exceeded' }
		);
	});

	test('rejects the wrong variant even when its price is lower', () => {
		assert.deepEqual(
			evaluatePurchase(
				policy,
				{ ...candidate, variantId: 'blue-64', itemTotal: 100 },
				new Date('2026-08-06T12:00:00.000Z')
			),
			{ allowed: false, reason: 'variant_mismatch' }
		);
	});

	test('rejects expired authorization', () => {
		assert.deepEqual(evaluatePurchase(policy, candidate, new Date('2026-08-06T12:05:00.000Z')), {
			allowed: false,
			reason: 'expired'
		});
	});
});
