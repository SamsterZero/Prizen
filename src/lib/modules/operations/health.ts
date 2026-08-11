export type HealthLevel = 'healthy' | 'warning' | 'critical' | 'unknown';

export function ageInSeconds(value: string | Date | null, now = new Date()) {
	if (!value) return null;
	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp)
		? Math.max(0, Math.floor((now.getTime() - timestamp) / 1000))
		: null;
}

export function trackerHealth(lastSuccessAt: string | Date | null, now = new Date()): HealthLevel {
	const age = ageInSeconds(lastSuccessAt, now);
	if (age === null) return 'unknown';
	if (age <= 90) return 'healthy';
	if (age <= 300) return 'warning';
	return 'critical';
}

export function backupHealth(lastBackupAt: string | Date | null, now = new Date()): HealthLevel {
	const age = ageInSeconds(lastBackupAt, now);
	if (age === null) return 'unknown';
	if (age <= 24 * 60 * 60) return 'healthy';
	if (age <= 7 * 24 * 60 * 60) return 'warning';
	return 'critical';
}

export function formatAge(value: string | Date | null, now = new Date()) {
	const seconds = ageInSeconds(value, now);
	if (seconds === null) return 'Never';
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 48) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}
