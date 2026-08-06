import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

const localOwnerEmail = 'owner@local.prizen';

/**
 * Prizen is a single-owner local tool. The internal owner keeps the existing
 * relational model intact without exposing account registration or sessions.
 */
export async function getLocalOwner() {
	const existing = await db.query.users.findFirst({ orderBy: [asc(users.createdAt)] });
	if (existing) return { id: existing.id, email: existing.email };

	await db
		.insert(users)
		.values({
			email: localOwnerEmail,
			passwordHash: 'local-login-disabled'
		})
		.onConflictDoNothing();
	const created = await db.query.users.findFirst({ where: eq(users.email, localOwnerEmail) });
	if (!created) throw new Error('Could not initialize the local Prizen owner.');
	return { id: created.id, email: created.email };
}
