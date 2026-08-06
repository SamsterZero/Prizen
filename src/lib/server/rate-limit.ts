type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
	const now = Date.now();
	if (buckets.size > 10_000) {
		for (const [bucketKey, entry] of buckets) {
			if (entry.resetAt <= now) buckets.delete(bucketKey);
		}
	}
	const existing = buckets.get(key);
	if (!existing || existing.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	if (existing.count >= limit) return false;
	existing.count += 1;
	return true;
}
