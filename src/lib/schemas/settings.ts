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
