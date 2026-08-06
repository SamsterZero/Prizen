import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hashPassword, verifyPassword } from './password';
import { availabilityIsStale } from './availability';
import { consumeRateLimit } from './rate-limit';
import { decryptSecret, encryptSecret } from './secret-crypto';

describe('security helpers', () => {
	test('hashes and verifies passwords without storing the original value', async () => {
		const password = 'a strong example password';
		const hash = await hashPassword(password);
		assert.equal(hash.includes(password), false);
		assert.equal(await verifyPassword(password, hash), true);
		assert.equal(await verifyPassword('incorrect password', hash), false);
	});

	test('encrypts notification credentials with authenticated encryption', () => {
		process.env.SECRET_ENCRYPTION_KEY = 'test-only-key-with-more-than-thirty-two-characters';
		const secret = 'https://discord.com/api/webhooks/example';
		const encrypted = encryptSecret(secret);
		assert.equal(encrypted.includes(secret), false);
		assert.equal(decryptSecret(encrypted), secret);
		const parts = encrypted.split(':');
		parts[4] = `${parts[4][0] === 'A' ? 'B' : 'A'}${parts[4].slice(1)}`;
		assert.throws(() => decryptSecret(parts.join(':')));
	});

	test('enforces rate-limit windows', () => {
		const key = `test:${crypto.randomUUID()}`;
		assert.equal(consumeRateLimit(key, 2, 60_000), true);
		assert.equal(consumeRateLimit(key, 2, 60_000), true);
		assert.equal(consumeRateLimit(key, 2, 60_000), false);
	});

	test('marks failed and overdue availability as stale', () => {
		const now = Date.now();
		assert.equal(availabilityIsStale('failed', new Date(now), 900, now), true);
		assert.equal(availabilityIsStale('pending', new Date(now - 3_600_001), 900, now), true);
		assert.equal(availabilityIsStale('pending', new Date(now - 60_000), 900, now), false);
	});
});
