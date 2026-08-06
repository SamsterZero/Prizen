import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notificationChannels } from '$lib/server/db/schema';

export async function DELETE({ params, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const deleted = await db
		.delete(notificationChannels)
		.where(
			and(eq(notificationChannels.id, params.id), eq(notificationChannels.userId, locals.user.id))
		)
		.returning({ id: notificationChannels.id });
	if (deleted.length === 0) throw error(404, 'Notification channel not found.');
	return new Response(null, { status: 204 });
}
