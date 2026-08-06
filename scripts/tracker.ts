import postgres from 'postgres';
import { logger } from './logger';
import { createTrackerWorker } from './tracker-worker';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const worker = createTrackerWorker({
	sql: postgres(databaseUrl),
	appUrl: process.env.APP_URL ?? 'http://app:3000',
	trackerToken: process.env.TRACKER_TOKEN ?? '',
	logger
});

let scanning = false;

async function runScan() {
	if (scanning) return;
	scanning = true;
	try {
		await worker.scanDueProducts();
		await worker.recordHeartbeat();
	} catch (exception) {
		logger.error({ err: exception }, 'Tracker scan cycle failed; retrying on the next interval');
		try {
			await worker.recordHeartbeat(exception);
		} catch {
			/* A database outage prevents heartbeat writes too; the health check will report it. */
		}
	} finally {
		scanning = false;
	}
}

logger.info('Tracker started');
await runScan();
setInterval(() => void runScan(), 5_000);
