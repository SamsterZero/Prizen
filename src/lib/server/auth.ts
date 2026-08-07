import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { sessionCookieIsSecure } from '$lib/server/session-cookie';

const sessionCookie = 'prizen_session';
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1_000;

function tokenHash(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, cookies: Cookies) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + sessionLifetimeMs);
	await db.insert(sessions).values({ userId, tokenHash: tokenHash(token), expiresAt });
	cookies.set(sessionCookie, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: sessionCookieIsSecure(),
		expires: expiresAt
	});
}

export async function readSession(cookies: Cookies) {
	const token = cookies.get(sessionCookie);
	if (!token) return null;
	const result = await db
		.select({ sessionId: sessions.id, userId: users.id, email: users.email })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())))
		.limit(1);
	return result[0] ?? null;
}

export async function destroySession(cookies: Cookies) {
	const token = cookies.get(sessionCookie);
	if (token) await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
	cookies.delete(sessionCookie, { path: '/' });
}
