import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, scanJobs } from '$lib/server/db/schema';

const pollingIntervals = new Set([15, 30, 60, 300, 900, 1800, 3600]);

export async function PATCH({ params, request, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const body = (await request.json()) as { targetPrice?: unknown; pollingSeconds?: unknown };
	const targetPrice = body.targetPrice;
	const pollingSeconds = body.pollingSeconds;
	if (targetPrice === undefined && pollingSeconds === undefined) {
		throw error(400, 'Provide a target price or polling interval.');
	}
	if (
		targetPrice !== undefined &&
		targetPrice !== null &&
		(typeof targetPrice !== 'number' || !Number.isFinite(targetPrice) || targetPrice <= 0)
	) {
		throw error(400, 'Target price must be a positive number or empty.');
	}
	if (
		pollingSeconds !== undefined &&
		(typeof pollingSeconds !== 'number' || !pollingIntervals.has(pollingSeconds))
	) {
		throw error(400, 'Polling interval must be between 15 seconds and 1 hour.');
	}
	const updated = await db
		.update(products)
		.set({
			...(targetPrice === undefined
				? {}
				: { targetPrice: targetPrice === null ? null : String(targetPrice) }),
			...(pollingSeconds === undefined
				? {}
				: { pollingIntervalSeconds: pollingSeconds, nextPollAt: new Date() }),
			updatedAt: new Date()
		})
		.where(and(eq(products.id, params.id), eq(products.userId, locals.user.id)))
		.returning({
			targetPrice: products.targetPrice,
			pollingSeconds: products.pollingIntervalSeconds
		});
	if (updated.length === 0) throw error(404, 'Tracked product not found.');
	if (pollingSeconds !== undefined) {
		await db
			.insert(scanJobs)
			.values({ productId: params.id, status: 'pending', runAt: new Date() })
			.onConflictDoUpdate({
				target: scanJobs.productId,
				set: { status: 'pending', runAt: new Date(), lockedAt: null, updatedAt: new Date() }
			});
	}
	return Response.json(updated[0]);
}

export async function DELETE({ params, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const deleted = await db
		.delete(products)
		.where(and(eq(products.id, params.id), eq(products.userId, locals.user.id)))
		.returning({ id: products.id });
	if (deleted.length === 0) throw error(404, 'Tracked product not found.');
	return new Response(null, { status: 204 });
}
