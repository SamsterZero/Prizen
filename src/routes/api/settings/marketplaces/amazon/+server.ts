import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { marketplaceConfigurations } from '$lib/server/db/schema';
import { decryptSecret, encryptSecret } from '$lib/server/secret-crypto';
import { amazonMarketplaceSettingsSchema } from '$lib/schemas/settings';
import type { AmazonCreatorsConfig } from '$lib/server/marketplace/amazon';

const marketplaceSlug = 'amazon';

function credentialVersion(secretReference: string | null) {
	if (!secretReference) return null;
	try {
		const config = JSON.parse(decryptSecret(secretReference)) as AmazonCreatorsConfig;
		return config.credentialVersion || null;
	} catch {
		return null;
	}
}

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
		dataSource: configuration?.dataSource === 'creators' ? 'creators' : 'html',
		creatorsConfigured: Boolean(configuration?.secretReference),
		credentialVersion: credentialVersion(configuration?.secretReference ?? null)
	});
}

export async function PATCH({ request, locals }) {
	if (!locals.user) throw error(401, 'Authentication required.');
	const parsed = amazonMarketplaceSettingsSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid settings.');
	const body = parsed.data;
	const existing = await db.query.marketplaceConfigurations.findFirst({
		where: and(
			eq(marketplaceConfigurations.userId, locals.user.id),
			eq(marketplaceConfigurations.marketplaceSlug, marketplaceSlug)
		),
		columns: { secretReference: true }
	});
	const suppliedCredentials = Boolean(
		body.credentialId ||
		body.credentialSecret ||
		body.credentialVersion ||
		body.partnerTagIndia ||
		body.partnerTagUnitedStates
	);
	let secretReference = existing?.secretReference ?? null;
	if (suppliedCredentials) {
		if (
			!body.credentialId ||
			!body.credentialSecret ||
			!body.credentialVersion ||
			(!body.partnerTagIndia && !body.partnerTagUnitedStates)
		) {
			throw error(400, 'Complete the Creators API credential bundle.');
		}
		secretReference = encryptSecret(
			JSON.stringify({
				credentialId: body.credentialId,
				credentialSecret: body.credentialSecret,
				credentialVersion: body.credentialVersion,
				partnerTagIndia: body.partnerTagIndia || undefined,
				partnerTagUnitedStates: body.partnerTagUnitedStates || undefined
			} satisfies AmazonCreatorsConfig)
		);
	}
	if (body.dataSource === 'creators' && !secretReference) {
		throw error(400, 'Configure Creators API credentials before enabling API mode.');
	}
	await db
		.insert(marketplaceConfigurations)
		.values({
			userId: locals.user.id,
			marketplaceSlug,
			dataSource: body.dataSource,
			secretReference
		})
		.onConflictDoUpdate({
			target: [marketplaceConfigurations.userId, marketplaceConfigurations.marketplaceSlug],
			set: { dataSource: body.dataSource, secretReference, updatedAt: new Date() }
		});
	return json({
		dataSource: body.dataSource,
		creatorsConfigured: Boolean(secretReference),
		credentialVersion: credentialVersion(secretReference)
	});
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
