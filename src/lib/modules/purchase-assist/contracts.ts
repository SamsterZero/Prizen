export const purchaseIntentStatuses = [
	'pending',
	'claimed',
	'awaiting_confirmation',
	'submitted',
	'completed',
	'rejected',
	'expired',
	'failed'
] as const;

export type PurchaseIntentStatus = (typeof purchaseIntentStatuses)[number];
export type PurchaseMode = 'confirm' | 'armed';

/**
 * Marketplace-neutral constraints authored by the user. Payment instruments and
 * marketplace session data deliberately do not belong in this contract.
 */
export type PurchasePolicy = {
	mode: PurchaseMode;
	maxTotal: number;
	currency: string;
	quantity: number;
	variantId?: string;
	allowedSellerIds?: string[];
	requireMarketplaceFulfilment: boolean;
	expiresAt: string;
};

export type PurchaseCandidate = {
	marketplace: string;
	externalId: string;
	variantId?: string;
	sellerId?: string;
	isMarketplaceFulfilled: boolean;
	quantity: number;
	itemTotal: number;
	deliveryTotal: number;
	taxTotal: number;
	currency: string;
	availability: 'in_stock' | 'out_of_stock' | 'unknown';
};

export type PurchaseIntent = {
	id: string;
	productId: string;
	marketplace: string;
	externalId: string;
	policy: PurchasePolicy;
	status: PurchaseIntentStatus;
	createdAt: string;
};

export type PurchaseRejectionReason =
	| 'expired'
	| 'not_in_stock'
	| 'currency_mismatch'
	| 'price_exceeded'
	| 'quantity_mismatch'
	| 'variant_mismatch'
	| 'seller_not_allowed'
	| 'fulfilment_mismatch';

export type PurchaseEvaluation =
	{ allowed: true; deliveredTotal: number } | { allowed: false; reason: PurchaseRejectionReason };
