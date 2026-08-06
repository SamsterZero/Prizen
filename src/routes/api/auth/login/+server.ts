import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSession } from '$lib/server/auth';
import { normalizeEmail, verifyPassword } from '$lib/server/password';
import { consumeRateLimit } from '$lib/server/rate-limit';

export async function POST({ request, cookies, getClientAddress }) {
	if (!consumeRateLimit(`login:${getClientAddress()}`, 8, 15 * 60_000)) {
		throw error(429, 'Too many sign-in attempts. Try again later.');
	}
	const body = (await request.json()) as { email?: unknown; password?: unknown };
	if (typeof body.email !== 'string' || typeof body.password !== 'string') {
		throw error(400, 'Email and password are required.');
	}
	if (body.email.length > 320 || body.password.length > 128) {
		throw error(400, 'Email or password is invalid.');
	}
	const user = await db.query.users.findFirst({
		where: eq(users.email, normalizeEmail(body.email))
	});
	if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
		throw error(401, 'Email or password is incorrect.');
	}
	await createSession(user.id, cookies);
	return json({ user: { id: user.id, email: user.email } });
}
