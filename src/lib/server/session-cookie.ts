export function sessionCookieIsSecure(origin = process.env.ORIGIN, nodeEnv = process.env.NODE_ENV) {
	if (!origin) return nodeEnv === 'production';
	try {
		return new URL(origin).protocol === 'https:';
	} catch {
		return nodeEnv === 'production';
	}
}
