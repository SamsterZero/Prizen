export type MarketplaceProduct = {
	externalId: string;
	title: string;
	brand?: string;
	imageUrl?: string;
	url: string;
	currency: string;
};

export type MarketplacePrice = {
	price: number;
	listPrice?: number;
	currency: string;
	availability: 'in_stock' | 'out_of_stock' | 'unknown';
	observedAt: Date;
};

export type MarketplaceCapability = 'product_tracking' | 'cart_handoff' | 'assisted_checkout';

export type MarketplacePurchaseTarget = {
	externalId: string;
	variantId?: string;
	sellerId?: string;
	quantity: number;
};

export type MarketplaceCheckoutHandoff = {
	url: string;
	expiresAt?: Date;
};

/** An adapter is the only boundary through which tracker code reaches a marketplace. */
export interface MarketplaceAdapter {
	readonly slug: string;
	readonly capabilities: ReadonlySet<MarketplaceCapability>;
	canHandle(url: URL): boolean;
	fetchProduct(url: URL): Promise<MarketplaceProduct>;
	fetchPrice(url: URL): Promise<MarketplacePrice>;
	createCheckoutHandoff?(target: MarketplacePurchaseTarget): Promise<MarketplaceCheckoutHandoff>;
}
