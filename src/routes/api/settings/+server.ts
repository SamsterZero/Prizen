import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { deliverySettingsSchema } from '$lib/schemas/settings';

export async function GET({ locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const settings = await db.query.userSettings.findFirst({
		where: eq(userSettings.userId, locals.user.id),
		columns: { deliveryPincode: true }
	});
	return json({ deliveryPincode: settings?.deliveryPincode ?? '' });
}

export async function PATCH({ request, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const parsed = deliverySettingsSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid settings.');
	const { deliveryPincode } = parsed.data;
	await db
		.insert(userSettings)
		.values({ userId: locals.user.id, deliveryPincode })
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: { deliveryPincode, updatedAt: new Date() }
		});
	return json({ deliveryPincode });
}
