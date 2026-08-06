import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) process.exit(1);

const sql = postgres(databaseUrl, { connect_timeout: 3 });
try {
	const [heartbeat] = await sql<{ healthy: boolean }[]>`
		select last_success_at > now() - interval '90 seconds' as healthy
		from tracker_heartbeats where name = 'tracker'
	`;
	if (!heartbeat?.healthy) process.exitCode = 1;
} catch {
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 1 });
}
