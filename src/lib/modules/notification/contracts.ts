export type PriceAlert = {
	productTitle: string;
	productUrl: string;
	currentPrice: number;
	targetPrice?: number;
	currency: string;
	reason: 'target_reached' | 'price_dropped' | 'new_low';
};

export interface NotificationProvider {
	readonly type: 'discord' | 'telegram';
	verify(secretReference: string): Promise<boolean>;
	send(secretReference: string, alert: PriceAlert): Promise<void>;
}
