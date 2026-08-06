import type { PurchaseCandidate, PurchaseEvaluation, PurchasePolicy } from './contracts';

function roundMoney(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Final local check performed immediately before a checkout handoff or submit. */
export function evaluatePurchase(
	policy: PurchasePolicy,
	candidate: PurchaseCandidate,
	now = new Date()
): PurchaseEvaluation {
	if (new Date(policy.expiresAt).getTime() <= now.getTime()) {
		return { allowed: false, reason: 'expired' };
	}
	if (candidate.availability !== 'in_stock') {
		return { allowed: false, reason: 'not_in_stock' };
	}
	if (candidate.currency.toUpperCase() !== policy.currency.toUpperCase()) {
		return { allowed: false, reason: 'currency_mismatch' };
	}
	if (candidate.quantity !== policy.quantity) {
		return { allowed: false, reason: 'quantity_mismatch' };
	}
	if (policy.variantId && candidate.variantId !== policy.variantId) {
		return { allowed: false, reason: 'variant_mismatch' };
	}
	if (
		policy.allowedSellerIds?.length &&
		(!candidate.sellerId || !policy.allowedSellerIds.includes(candidate.sellerId))
	) {
		return { allowed: false, reason: 'seller_not_allowed' };
	}
	if (policy.requireMarketplaceFulfilment && !candidate.isMarketplaceFulfilled) {
		return { allowed: false, reason: 'fulfilment_mismatch' };
	}
	const deliveredTotal = roundMoney(
		candidate.itemTotal + candidate.deliveryTotal + candidate.taxTotal
	);
	if (!Number.isFinite(deliveredTotal) || deliveredTotal > policy.maxTotal) {
		return { allowed: false, reason: 'price_exceeded' };
	}
	return { allowed: true, deliveredTotal };
}
