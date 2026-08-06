import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey() {
	const secret = process.env.SECRET_ENCRYPTION_KEY;
	if (!secret || secret.length < 32) {
		throw new Error('SECRET_ENCRYPTION_KEY must contain at least 32 characters.');
	}
	return createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
	const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	return [
		'enc',
		'v1',
		iv.toString('base64url'),
		cipher.getAuthTag().toString('base64url'),
		encrypted.toString('base64url')
	].join(':');
}

export function decryptSecret(value: string) {
	if (!value.startsWith('enc:v1:')) return value;
	const [, , ivValue, tagValue, encryptedValue] = value.split(':');
	if (!ivValue || !tagValue || !encryptedValue) throw new Error('Encrypted secret is malformed.');
	const decipher = createDecipheriv(
		'aes-256-gcm',
		encryptionKey(),
		Buffer.from(ivValue, 'base64url')
	);
	decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
	return Buffer.concat([
		decipher.update(Buffer.from(encryptedValue, 'base64url')),
		decipher.final()
	]).toString('utf8');
}
