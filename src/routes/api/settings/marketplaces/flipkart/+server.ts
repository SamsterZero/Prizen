import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { flipkartMarketplaceSettingsSchema } from '$lib/schemas/settings';
import { db } from '$lib/server/db';
import { marketplaceConfigurations } from '$lib/server/db/schema';
import type { FlipkartAffiliateConfig } from '$lib/server/marketplace/flipkart';
import { encryptSecret } from '$lib/server/secret-crypto';

const marketplaceSlug = 'flipkart';

export async function GET({ locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const configuration = await db.query.marketplaceConfigurations.findFirst({
		where: and(
			eq(marketplaceConfigurations.userId, locals.user.id),
			eq(marketplaceConfigurations.marketplaceSlug, marketplaceSlug)
		),
		columns: { dataSource: true, secretReference: true }
	});
	return json({
		dataSource: configuration?.dataSource === 'affiliate-api' ? 'affiliate-api' : 'html',
		configured: Boolean(configuration?.secretReference)
	});
}

export async function PATCH({ request, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const parsed = flipkartMarketplaceSettingsSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid settings.');
	const existing = await db.query.marketplaceConfigurations.findFirst({
		where: and(
			eq(marketplaceConfigurations.userId, locals.user.id),
			eq(marketplaceConfigurations.marketplaceSlug, marketplaceSlug)
		),
		columns: { secretReference: true }
	});
	let secretReference = existing?.secretReference ?? null;
	if (parsed.data.affiliateId && parsed.data.affiliateToken) {
		secretReference = encryptSecret(
			JSON.stringify({
				affiliateId: parsed.data.affiliateId,
				affiliateToken: parsed.data.affiliateToken
			} satisfies FlipkartAffiliateConfig)
		);
	}
	if (parsed.data.dataSource === 'affiliate-api' && !secretReference) {
		throw error(400, 'Configure Affiliate API credentials before enabling API mode.');
	}
	await db
		.insert(marketplaceConfigurations)
		.values({
			userId: locals.user.id,
			marketplaceSlug,
			dataSource: parsed.data.dataSource,
			secretReference
		})
		.onConflictDoUpdate({
			target: [marketplaceConfigurations.userId, marketplaceConfigurations.marketplaceSlug],
			set: { dataSource: parsed.data.dataSource, secretReference, updatedAt: new Date() }
		});
	return json({ dataSource: parsed.data.dataSource, configured: Boolean(secretReference) });
}

export async function DELETE({ locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	await db
		.delete(marketplaceConfigurations)
		.where(
			and(
				eq(marketplaceConfigurations.userId, locals.user.id),
				eq(marketplaceConfigurations.marketplaceSlug, marketplaceSlug)
			)
		);
	return new Response(null, { status: 204 });
}
