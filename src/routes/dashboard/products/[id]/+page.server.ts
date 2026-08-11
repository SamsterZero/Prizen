import { error } from '@sveltejs/kit';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	latestPrices,
	marketplaces,
	priceHistory,
	products,
	scanJobs
} from '$lib/server/db/schema';
import type { TrackedProduct } from '$lib/types/tracking';
import { availabilityIsStale } from '$lib/server/availability';
import type { PageServerLoad } from './$types';
import {
	analyticsRanges,
	analyticsDateToISOString,
	parseAnalyticsRange,
	rangeCutoff,
	type PriceAnalytics
} from '$lib/modules/tracker/analytics';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) throw error(401, 'Authentication required.');
	const range = parseAnalyticsRange(url.searchParams.get('range'));
	const cutoff = rangeCutoff(range);
	const bucketInterval = sql.raw(`interval '${analyticsRanges[range].bucketMinutes} minutes'`);
	const bucket = sql<Date>`date_bin(${bucketInterval}, ${priceHistory.observedAt}, timestamp with time zone '1970-01-01')`;

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
			price: sql<string>`(array_agg(${priceHistory.price} order by ${priceHistory.observedAt} desc))[1]`,
			availability: latestPrices.availability,
			availabilityObservedAt: latestPrices.observedAt,
			scanStatus: scanJobs.status,
			failureCount: scanJobs.failureCount,
			observedAt: sql<Date>`max(${priceHistory.observedAt})`,
			bucket
		})
		.from(products)
		.innerJoin(marketplaces, eq(marketplaces.id, products.marketplaceId))
		.leftJoin(priceHistory, eq(priceHistory.productId, products.id))
		.leftJoin(latestPrices, eq(latestPrices.productId, products.id))
		.leftJoin(scanJobs, eq(scanJobs.productId, products.id))
		.where(
			and(
				eq(products.id, params.id),
				eq(products.userId, locals.user.id),
				gte(priceHistory.observedAt, cutoff)
			)
		)
		.groupBy(
			products.id,
			marketplaces.slug,
			marketplaces.name,
			latestPrices.availability,
			latestPrices.observedAt,
			scanJobs.status,
			scanJobs.failureCount,
			bucket
		)
		.orderBy(desc(bucket))
		.limit(analyticsRanges[range].pointLimit);

	// A product with no observations in the selected range still needs to render its empty state.
	const metadata =
		rows[0] ??
		(
			await db
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
					price: latestPrices.price,
					availability: latestPrices.availability,
					availabilityObservedAt: latestPrices.observedAt,
					scanStatus: scanJobs.status,
					failureCount: scanJobs.failureCount,
					observedAt: latestPrices.observedAt
				})
				.from(products)
				.innerJoin(marketplaces, eq(marketplaces.id, products.marketplaceId))
				.leftJoin(latestPrices, eq(latestPrices.productId, products.id))
				.leftJoin(scanJobs, eq(scanJobs.productId, products.id))
				.where(and(eq(products.id, params.id), eq(products.userId, locals.user.id)))
				.limit(1)
		)[0];

	if (!metadata) throw error(404, 'Tracked product not found.');
	const [summary] = await db
		.select({
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
		.where(
			and(
				eq(products.id, params.id),
				eq(products.userId, locals.user.id),
				gte(priceHistory.observedAt, cutoff)
			)
		);
	const firstPrice = summary?.firstPrice ? Number(summary.firstPrice) : null;
	const currentPrice = summary?.currentPrice ? Number(summary.currentPrice) : null;
	const averagePrice = summary?.averagePrice ? Number(summary.averagePrice) : null;
	const analytics: PriceAnalytics = {
		firstPrice,
		currentPrice,
		lowestPrice: summary?.lowestPrice ? Number(summary.lowestPrice) : null,
		highestPrice: summary?.highestPrice ? Number(summary.highestPrice) : null,
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
	const history = rows
		.flatMap((row) =>
			row.price !== null && row.observedAt !== null
				? [{ price: Number(row.price), observedAt: analyticsDateToISOString(row.observedAt)! }]
				: []
		)
		.reverse();

	const product: TrackedProduct = {
		id: metadata.id,
		title: metadata.title,
		url: metadata.url,
		currency: metadata.currency,
		targetPrice: metadata.targetPrice === null ? null : Number(metadata.targetPrice),
		pollingSeconds: metadata.pollingSeconds,
		createdAt: metadata.createdAt.toISOString(),
		marketplace: { slug: metadata.marketplaceSlug, name: metadata.marketplaceName },
		analytics,
		analyticsRange: range,
		availability: availabilityIsStale(
			metadata.scanStatus,
			metadata.availabilityObservedAt,
			metadata.pollingSeconds
		)
			? 'unknown'
			: (metadata.availability ?? 'unknown'),
		failureCount: metadata.failureCount ?? 0,
		history
	};

	return { product };
};
