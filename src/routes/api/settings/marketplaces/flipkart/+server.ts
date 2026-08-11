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
		columns: { secretReference: true }
	});
	return json({ configured: Boolean(configuration?.secretReference) });
}

export async function PATCH({ request, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const parsed = flipkartMarketplaceSettingsSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid settings.');
	const secretReference = encryptSecret(
		JSON.stringify(parsed.data satisfies FlipkartAffiliateConfig)
	);
	await db
		.insert(marketplaceConfigurations)
		.values({
			userId: locals.user.id,
			marketplaceSlug,
			dataSource: 'affiliate-api',
			secretReference
		})
		.onConflictDoUpdate({
			target: [marketplaceConfigurations.userId, marketplaceConfigurations.marketplaceSlug],
			set: { dataSource: 'affiliate-api', secretReference, updatedAt: new Date() }
		});
	return json({ configured: true });
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
