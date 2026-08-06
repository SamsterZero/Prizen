import { error, json } from '@sveltejs/kit';
import { and, count, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notificationChannels, products, users } from '$lib/server/db/schema';
import { createSession } from '$lib/server/auth';
import { hashPassword, normalizeEmail } from '$lib/server/password';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { encryptSecret } from '$lib/server/secret-crypto';

export async function POST({ request, cookies, getClientAddress }) {
	if (!consumeRateLimit(`register:${getClientAddress()}`, 5, 60 * 60_000)) {
		throw error(429, 'Too many registration attempts. Try again later.');
	}
	const body = (await request.json()) as { email?: unknown; password?: unknown };
	if (typeof body.email !== 'string' || typeof body.password !== 'string') {
		throw error(400, 'Email and password are required.');
	}
	const email = normalizeEmail(body.email);
	if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw error(400, 'Enter a valid email address.');
	}
	if (body.password.length < 12 || body.password.length > 128) {
		throw error(400, 'Password must be between 12 and 128 characters.');
	}
	const password = body.password;
	try {
		const user = await db.transaction(async (transaction) => {
			const [{ value: existingUsers }] = await transaction.select({ value: count() }).from(users);
			const [created] = await transaction
				.insert(users)
				.values({ email, passwordHash: await hashPassword(password) })
				.returning({ id: users.id, email: users.email });
			// A first account safely adopts rows created by pre-auth MVP versions.
			if (existingUsers === 0) {
				await transaction
					.update(products)
					.set({ userId: created.id })
					.where(isNull(products.userId));
				const legacyChannels = await transaction
					.select({ id: notificationChannels.id, secret: notificationChannels.secretReference })
					.from(notificationChannels)
					.where(isNull(notificationChannels.userId));
				for (const channel of legacyChannels) {
					await transaction
						.update(notificationChannels)
						.set({
							userId: created.id,
							secretReference: channel.secret.startsWith('enc:v1:')
								? channel.secret
								: encryptSecret(channel.secret)
						})
						.where(
							and(eq(notificationChannels.id, channel.id), isNull(notificationChannels.userId))
						);
				}
			}
			return created;
		});
		await createSession(user.id, cookies);
		return json({ user }, { status: 201 });
	} catch (exception) {
		if (
			typeof exception === 'object' &&
			exception !== null &&
			'code' in exception &&
			exception.code === '23505'
		) {
			throw error(409, 'An account with this email already exists.');
		}
		throw error(500, 'Prizen could not create this account. Check the server configuration.');
	}
}
