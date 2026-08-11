import { error, json } from '@sveltejs/kit';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	latestPrices,
	marketplaces,
	priceHistory,
	products,
	scanJobs
} from '$lib/server/db/schema';
import { availabilityIsStale } from '$lib/server/availability';
import {
	analyticsRanges,
	analyticsDateToISOString,
	parseAnalyticsRange,
	rangeCutoff,
	type PriceAnalytics
} from '$lib/modules/tracker/analytics';

export async function GET({ locals, url }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const range = parseAnalyticsRange(url.searchParams.get('range'));
	const marketplaceFilter = url.searchParams.get('marketplace')?.trim() || null;
	const cutoff = rangeCutoff(range);
	const productWhere = and(
		eq(products.userId, locals.user.id),
		marketplaceFilter ? eq(marketplaces.slug, marketplaceFilter) : undefined
	);
	const rows = await db
		.select({
			id: products.id,
			title: products.title,
			url: products.url,
			currency: products.currency,
			targetPrice: products.targetPrice,
			pollingSeconds: products.pollingIntervalSeconds,
			createdAt: products.createdAt,
			marketplaceSlug: marketplaces.slug,
			marketplaceName: marketplaces.name,
			availability: latestPrices.availability,
			availabilityObservedAt: latestPrices.observedAt,
			scanStatus: scanJobs.status,
			failureCount: scanJobs.failureCount
		})
		.from(products)
		.innerJoin(marketplaces, eq(marketplaces.id, products.marketplaceId))
		.leftJoin(latestPrices, eq(latestPrices.productId, products.id))
		.leftJoin(scanJobs, eq(scanJobs.productId, products.id))
		.where(productWhere)
		.orderBy(asc(products.createdAt))
		.limit(100);

	const summaries = await db
		.select({
			productId: priceHistory.productId,
			firstPrice: sql<string>`(array_agg(${priceHistory.price} order by ${priceHistory.observedAt} asc))[1]`,
			currentPrice: sql<string>`(array_agg(${priceHistory.price} order by ${priceHistory.observedAt} desc))[1]`,
			lowestPrice: sql<string>`min(${priceHistory.price})`,
			highestPrice: sql<string>`max(${priceHistory.price})`,
			averagePrice: sql<string>`avg(${priceHistory.price})`,
			volatility: sql<string | null>`stddev_pop(${priceHistory.price})`,
			observationCount: sql<number>`count(*)::integer`,
			lastObservedAt: sql<Date>`max(${priceHistory.observedAt})`
		})
		.from(priceHistory)
		.innerJoin(products, eq(products.id, priceHistory.productId))
		.innerJoin(marketplaces, eq(marketplaces.id, products.marketplaceId))
		.where(and(productWhere, gte(priceHistory.observedAt, cutoff)))
		.groupBy(priceHistory.productId);
	const summaryByProduct = new Map(summaries.map((summary) => [summary.productId, summary]));

	const result = [];
	for (const row of rows) {
		const summary = summaryByProduct.get(row.id);
		const firstPrice = summary ? Number(summary.firstPrice) : null;
		const currentPrice = summary ? Number(summary.currentPrice) : null;
		const averagePrice = summary ? Number(summary.averagePrice) : null;
		const analytics: PriceAnalytics = {
			firstPrice,
			currentPrice,
			lowestPrice: summary ? Number(summary.lowestPrice) : null,
			highestPrice: summary ? Number(summary.highestPrice) : null,
			averagePrice,
			changePercent:
				summary && summary.observationCount >= 2 && firstPrice !== 0
					? ((currentPrice! - firstPrice!) / firstPrice!) * 100
					: null,
			volatilityPercent:
				summary && summary.observationCount >= 3 && averagePrice !== 0
					? (Number(summary.volatility) / averagePrice!) * 100
					: null,
			observationCount: summary?.observationCount ?? 0,
			lastObservedAt: analyticsDateToISOString(summary?.lastObservedAt)
		};
		result.push({
			id: row.id,
			title: row.title,
			url: row.url,
			currency: row.currency,
			targetPrice: row.targetPrice === null ? null : Number(row.targetPrice),
			pollingSeconds: row.pollingSeconds,
			createdAt: row.createdAt.toISOString(),
			marketplace: { slug: row.marketplaceSlug, name: row.marketplaceName },
			analytics,
			analyticsRange: range,
			availability: availabilityIsStale(
				row.scanStatus,
				row.availabilityObservedAt,
				row.pollingSeconds
			)
				? 'unknown'
				: (row.availability ?? 'unknown'),
			failureCount: row.failureCount ?? 0,
			history: []
		});
	}
	return json(result, {
		headers: {
			'x-prizen-analytics-range': analyticsRanges[range].label,
			'x-prizen-result-limit': '100'
		}
	});
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
