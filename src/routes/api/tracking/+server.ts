import { error, json } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	latestPrices,
	marketplaces,
	priceHistory,
	products,
	scanJobs
} from '$lib/server/db/schema';
import { availabilityIsStale } from '$lib/server/availability';

export async function GET({ locals }) {
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
		.where(eq(products.userId, locals.user.id))
		.orderBy(asc(products.createdAt), asc(priceHistory.observedAt));
	const grouped = new Map<
		string,
		{
			id: string;
			title: string;
			url: string;
			currency: string;
			targetPrice: number | null;
			pollingSeconds: number;
			createdAt: string;
			availability: 'in_stock' | 'out_of_stock' | 'unknown';
			failureCount: number;
			history: { price: number; observedAt: string }[];
		}
	>();
	for (const row of rows) {
		const product = grouped.get(row.id) ?? {
			id: row.id,
			title: row.title,
			url: row.url,
			currency: row.currency,
			targetPrice: row.targetPrice === null ? null : Number(row.targetPrice),
			pollingSeconds: row.pollingSeconds,
			createdAt: row.createdAt.toISOString(),
			availability: availabilityIsStale(
				row.scanStatus,
				row.availabilityObservedAt,
				row.pollingSeconds
			)
				? 'unknown'
				: (row.availability ?? 'unknown'),
			failureCount: row.failureCount ?? 0,
			history: []
		};
		if (row.price !== null && row.observedAt !== null) {
			product.history.push({ price: Number(row.price), observedAt: row.observedAt.toISOString() });
		}
		grouped.set(row.id, product);
	}
	return json([...grouped.values()]);
}

export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const body = (await request.json()) as {
		title?: unknown;
		url?: unknown;
		currentPrice?: unknown;
		currency?: unknown;
		pollingSeconds?: unknown;
	};
	if (
		typeof body.title !== 'string' ||
		typeof body.url !== 'string' ||
		typeof body.currentPrice !== 'number' ||
		typeof body.currency !== 'string' ||
		typeof body.pollingSeconds !== 'number'
	) {
		throw error(400, 'Invalid product tracking request.');
	}

	try {
		await db
			.insert(marketplaces)
			.values({ slug: 'amazon', name: 'Amazon', websiteUrl: 'https://www.amazon.in/' })
			.onConflictDoNothing();
		const marketplace = await db.query.marketplaces.findFirst({
			where: eq(marketplaces.slug, 'amazon')
		});
		if (!marketplace) throw error(500, 'Amazon marketplace configuration is unavailable.');
		const externalId = new URL(body.url).pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] ?? body.url;
		const existing = await db.query.products.findFirst({
			where: and(eq(products.url, body.url), eq(products.userId, locals.user.id))
		});
		const [product] = existing
			? await db
					.update(products)
					.set({
						title: body.title,
						currency: body.currency,
						pollingIntervalSeconds: body.pollingSeconds,
						nextPollAt: new Date()
					})
					.where(eq(products.id, existing.id))
					.returning()
			: await db
					.insert(products)
					.values({
						userId: locals.user.id,
						marketplaceId: marketplace.id,
						externalId,
						url: body.url,
						title: body.title,
						currency: body.currency,
						pollingIntervalSeconds: body.pollingSeconds
					})
					.returning();
		await db.insert(priceHistory).values({
			productId: product.id,
			price: String(body.currentPrice),
			currency: body.currency,
			availability: 'in_stock'
		});
		await db
			.insert(latestPrices)
			.values({
				productId: product.id,
				price: String(body.currentPrice),
				currency: body.currency,
				availability: 'in_stock'
			})
			.onConflictDoUpdate({
				target: latestPrices.productId,
				set: { price: String(body.currentPrice), currency: body.currency, observedAt: new Date() }
			});
		await db
			.insert(scanJobs)
			.values({ productId: product.id, runAt: new Date() })
			.onConflictDoUpdate({
				target: scanJobs.productId,
				set: { status: 'pending', runAt: new Date(), updatedAt: new Date() }
			});
		return json({ id: product.id });
	} catch {
		throw error(503, 'Prizen could not save this tracker. Check that the database is running.');
	}
}
