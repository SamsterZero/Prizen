import { chmod, mkdir, open, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const directory = process.env.PRIZEN_SECRETS_DIR ?? '/run/secrets/prizen';
const secrets = [
	['encryption-key', 32],
	['tracker-token', 32],
	['database-password', 24]
] as const;

await mkdir(directory, { recursive: true });

for (const [name, bytes] of secrets) {
	const path = join(directory, name);
	try {
		const file = await open(path, 'wx', 0o400);
		try {
			await file.writeFile(`${randomBytes(bytes).toString('hex')}\n`);
		} finally {
			await file.close();
		}
	} catch (error) {
		if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
		if (!(await readFile(path, 'utf8')).trim())
			throw new Error(`Existing secret is empty: ${path}`, { cause: error });
	}
	await chmod(path, 0o444);
}

console.log('Prizen secrets are initialized.');
