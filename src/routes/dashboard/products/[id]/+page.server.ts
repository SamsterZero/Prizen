import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { latestPrices, priceHistory, products, scanJobs } from '$lib/server/db/schema';
import type { TrackedProduct } from '$lib/types/tracking';
import { availabilityIsStale } from '$lib/server/availability';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Authentication required.');

	const rows = await db
		.select({
			id: products.id,
			title: products.title,
			url: products.url,
			currency: products.currency,
			targetPrice: products.targetPrice,
			pollingSeconds: products.pollingIntervalSeconds,
			createdAt: products.createdAt,
			price: priceHistory.price,
			availability: latestPrices.availability,
			availabilityObservedAt: latestPrices.observedAt,
			scanStatus: scanJobs.status,
			failureCount: scanJobs.failureCount,
			observedAt: priceHistory.observedAt
		})
		.from(products)
		.leftJoin(priceHistory, eq(priceHistory.productId, products.id))
		.leftJoin(latestPrices, eq(latestPrices.productId, products.id))
		.leftJoin(scanJobs, eq(scanJobs.productId, products.id))
		.where(and(eq(products.id, params.id), eq(products.userId, locals.user.id)))
		.orderBy(asc(priceHistory.observedAt));

	const first = rows[0];
	if (!first) throw error(404, 'Tracked product not found.');

	const product: TrackedProduct = {
		id: first.id,
		title: first.title,
		url: first.url,
		currency: first.currency,
		targetPrice: first.targetPrice === null ? null : Number(first.targetPrice),
		pollingSeconds: first.pollingSeconds,
		createdAt: first.createdAt.toISOString(),
		availability: availabilityIsStale(
			first.scanStatus,
			first.availabilityObservedAt,
			first.pollingSeconds
		)
			? 'unknown'
			: (first.availability ?? 'unknown'),
		failureCount: first.failureCount ?? 0,
		history: rows.flatMap((row) =>
			row.price !== null && row.observedAt !== null
				? [{ price: Number(row.price), observedAt: row.observedAt.toISOString() }]
				: []
		)
	};

	return { product };
};
