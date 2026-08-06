export function availabilityIsStale(
	jobStatus: string | null,
	observedAt: Date | null,
	pollingSeconds: number,
	now = Date.now()
) {
	if (jobStatus === 'failed' || !observedAt) return true;
	const maximumAge = Math.max(pollingSeconds * 3_000, 60 * 60_000);
	return now - observedAt.getTime() > maximumAge;
}
