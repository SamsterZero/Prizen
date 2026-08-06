import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
	const salt = randomBytes(16);
	const derived = (await scrypt(password, salt, 64)) as Buffer;
	return `scrypt:${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string) {
	const [algorithm, saltValue, hashValue] = encoded.split(':');
	if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false;
	const salt = Buffer.from(saltValue, 'base64url');
	const expected = Buffer.from(hashValue, 'base64url');
	const actual = (await scrypt(password, salt, expected.length)) as Buffer;
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
