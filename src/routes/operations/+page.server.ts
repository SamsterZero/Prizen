import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { backupHealth, trackerHealth } from '$lib/modules/operations/health';
import type { PageServerLoad } from './$types';

type TrackerRow = { last_success_at: string | Date | null; last_error_at: string | Date | null };
type ScanRow = {
	pending: number;
	running: number;
	failed: number;
	overdue: number;
	oldest_overdue_at: string | Date | null;
	last_success_at: string | Date | null;
};
type NotificationRow = {
	pending: number;
	failed: number;
	delivered_24h: number;
	failed_24h: number;
	last_delivered_at: string | Date | null;
	last_failed_at: string | Date | null;
	verified_channels: number;
};
type StorageRow = {
	database_bytes: number;
	observation_count: number;
	observations_24h: number;
	oldest_observation_at: string | Date | null;
	newest_observation_at: string | Date | null;
};
type BackupRow = { last_backup_at: string | Date | null };

function first<T>(rows: unknown) {
	return (rows as T[])[0];
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [trackerResult, scanResult, notificationResult, storageResult, backupResult] =
		await Promise.all([
			db.execute(
				sql`select last_success_at, last_error_at from tracker_heartbeats where name = 'tracker' limit 1`
			),
			db.execute(sql`
				select
					count(*) filter (where job.status = 'pending')::int as pending,
					count(*) filter (where job.status = 'running')::int as running,
					count(*) filter (where job.status = 'failed')::int as failed,
					count(*) filter (where job.status in ('pending', 'failed') and job.run_at < now())::int as overdue,
					min(job.run_at) filter (where job.status in ('pending', 'failed') and job.run_at < now()) as oldest_overdue_at,
					max(product.last_polled_at) as last_success_at
				from scan_jobs job join products product on product.id = job.product_id
				where product.user_id = ${userId}
			`),
			db.execute(sql`
				select
					count(*) filter (where log.status = 'pending')::int as pending,
					count(*) filter (where log.status = 'failed')::int as failed,
					count(*) filter (where log.status = 'sent' and log.delivered_at >= now() - interval '24 hours')::int as delivered_24h,
					count(*) filter (where log.status = 'failed' and log.attempted_at >= now() - interval '24 hours')::int as failed_24h,
					max(log.delivered_at) as last_delivered_at,
					max(log.attempted_at) filter (where log.status = 'failed') as last_failed_at,
					count(distinct channel.id) filter (where channel.is_verified)::int as verified_channels
				from notification_channels channel
				left join notification_logs log on log.channel_id = channel.id
				where channel.user_id = ${userId}
			`),
			db.execute(sql`
				select
					pg_database_size(current_database())::bigint as database_bytes,
					count(history.id)::int as observation_count,
					count(history.id) filter (where history.observed_at >= now() - interval '24 hours')::int as observations_24h,
					min(history.observed_at) as oldest_observation_at,
					max(history.observed_at) as newest_observation_at
				from products product left join price_history history on history.product_id = product.id
				where product.user_id = ${userId}
			`),
			db.execute(sql`
				select max(occurred_at) as last_backup_at from maintenance_events
				where kind = 'backup' and status = 'succeeded'
			`)
		]);

	const tracker = first<TrackerRow>(trackerResult) ?? {
		last_success_at: null,
		last_error_at: null
	};
	const scans = first<ScanRow>(scanResult)!;
	const notifications = first<NotificationRow>(notificationResult)!;
	const storage = first<StorageRow>(storageResult)!;
	const backup = first<BackupRow>(backupResult) ?? { last_backup_at: null };
	return {
		generatedAt: new Date().toISOString(),
		tracker: {
			level: trackerHealth(tracker.last_success_at),
			lastSuccessAt: tracker.last_success_at,
			lastErrorAt: tracker.last_error_at
		},
		scans,
		notifications,
		storage: { ...storage, database_bytes: Number(storage.database_bytes) },
		backup: { level: backupHealth(backup.last_backup_at), lastBackupAt: backup.last_backup_at }
	};
};
