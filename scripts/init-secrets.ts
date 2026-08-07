import { chmod, mkdir, open, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const directory = process.env.PRIZEN_SECRETS_DIR ?? '/run/secrets/prizen';
const configuredDatabasePassword = process.env.PRIZEN_DATABASE_PASSWORD?.trim() || undefined;
const secrets = [
	['encryption-key', 32, undefined],
	['tracker-token', 32, undefined],
	['database-password', 24, configuredDatabasePassword]
] as const;

await mkdir(directory, { recursive: true });

for (const [name, bytes, providedValue] of secrets) {
	if (providedValue !== undefined && providedValue.length < 16) {
		throw new Error(`${name} must contain at least 16 characters`);
	}
	const path = join(directory, name);
	try {
		const file = await open(path, 'wx', 0o400);
		try {
			await file.writeFile(`${providedValue ?? randomBytes(bytes).toString('hex')}\n`);
		} finally {
			await file.close();
		}
	} catch (error) {
		if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
		const persistedValue = (await readFile(path, 'utf8')).trim();
		if (!persistedValue) throw new Error(`Existing secret is empty: ${path}`, { cause: error });
		if (providedValue !== undefined && providedValue !== persistedValue) {
			throw new Error(`${name} cannot be changed without restoring or recreating the database`, {
				cause: error
			});
		}
	}
	await chmod(path, 0o444);
}

console.log('Prizen secrets are initialized.');
