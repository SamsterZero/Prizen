import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getLocalOwner } from '$lib/server/local-owner';
import { consumeRateLimit } from '$lib/server/rate-limit';

Sentry.init({
	dsn: env.SENTRY_DSN,
	enabled: env.ENABLE_TELEMETRY === 'true' && Boolean(env.SENTRY_DSN),
	tracesSampleRate: 0.1,
	sendDefaultPii: false
});

const localHandle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const publicPaths = new Set(['/', '/about', '/privacy', '/api/health']);
	const needsOwner = !publicPaths.has(path) && !path.startsWith('/_app/');
	event.locals.user = needsOwner ? await getLocalOwner() : null;
	event.locals.sessionId = null;

	if (path === '/login' || path === '/register') throw redirect(303, '/dashboard');
	if (path.startsWith('/api/auth/')) {
		return Response.json({ message: 'Account login is disabled in local mode.' }, { status: 410 });
	}
	if (
		event.locals.user &&
		path.startsWith('/api/') &&
		!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) &&
		!consumeRateLimit(`mutation:${event.locals.user.id}`, 120, 60_000)
	) {
		return Response.json({ message: 'Too many requests. Try again shortly.' }, { status: 429 });
	}
	const response = await resolve(event);
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set(
		'content-security-policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
	);
	return response;
};

export const handle = sequence(Sentry.sentryHandle(), localHandle);
export const handleError = Sentry.handleErrorWithSentry();
