import { z } from 'zod';

export const deliverySettingsSchema = z.object({
	deliveryPincode: z
		.string()
		.trim()
		.regex(/^\d{6}$/, 'Enter a valid 6-digit delivery pincode.')
});

export const notificationChannelSchema = z
	.object({
		provider: z.enum(['discord', 'telegram']),
		label: z.string().trim().min(1, 'A label is required.').max(128),
		destination: z.string().trim().min(1, 'A destination is required.'),
		botToken: z.string().trim().optional()
	})
	.superRefine((value, context) => {
		if (value.provider === 'telegram' && !value.botToken) {
			context.addIssue({
				code: 'custom',
				path: ['botToken'],
				message: 'A Telegram bot token is required.'
			});
		}
	});

export const amazonMarketplaceSettingsSchema = z
	.object({
		dataSource: z.enum(['html', 'creators']),
		credentialId: z.string().trim().max(512).optional(),
		credentialSecret: z.string().trim().max(2048).optional(),
		credentialVersion: z.enum(['3.1', '3.2', '3.3']).optional(),
		partnerTagIndia: z.string().trim().max(128).optional(),
		partnerTagUnitedStates: z.string().trim().max(128).optional()
	})
	.superRefine((value, context) => {
		const credentialValues = [
			value.credentialId,
			value.credentialSecret,
			value.credentialVersion,
			value.partnerTagIndia,
			value.partnerTagUnitedStates
		];
		const supplied = credentialValues.filter(Boolean).length;
		if (supplied > 0 && supplied < 4) {
			context.addIssue({
				code: 'custom',
				message:
					'Enter the credential ID, secret, version, and at least one marketplace partner tag.'
			});
		}
	});

export const flipkartMarketplaceSettingsSchema = z
	.object({
		dataSource: z.enum(['html', 'affiliate-api']),
		affiliateId: z.string().trim().max(256).optional(),
		affiliateToken: z.string().trim().max(2048).optional()
	})
	.superRefine((value, context) => {
		if (Boolean(value.affiliateId) !== Boolean(value.affiliateToken)) {
			context.addIssue({
				code: 'custom',
				message: 'Enter both the Affiliate ID and Affiliate token.'
			});
		}
	});
