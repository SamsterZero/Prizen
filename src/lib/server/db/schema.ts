import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';

export const productStatus = pgEnum('product_status', ['active', 'archived']);
export const availabilityStatus = pgEnum('availability_status', [
	'in_stock',
	'out_of_stock',
	'unknown'
]);
export const notificationProvider = pgEnum('notification_provider', ['discord', 'telegram']);

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	email: varchar('email', { length: 320 }).notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('sessions_user_id_idx').on(table.userId),
		index('sessions_expires_at_idx').on(table.expiresAt)
	]
);

export const userSettings = pgTable('user_settings', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	deliveryPincode: varchar('delivery_pincode', { length: 12 }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** Marketplace configuration is owned by the marketplace module. */
export const marketplaces = pgTable('marketplaces', {
	id: uuid('id').defaultRandom().primaryKey(),
	slug: varchar('slug', { length: 64 }).notNull().unique(),
	name: varchar('name', { length: 128 }).notNull(),
	websiteUrl: text('website_url').notNull(),
	isEnabled: boolean('is_enabled').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** Per-owner marketplace access settings; provider secrets are encrypted as one bundle. */
export const marketplaceConfigurations = pgTable(
	'marketplace_configurations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		marketplaceSlug: varchar('marketplace_slug', { length: 64 }).notNull(),
		dataSource: varchar('data_source', { length: 24 }).notNull().default('html'),
		secretReference: text('secret_reference'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('marketplace_configurations_user_slug_unique').on(
			table.userId,
			table.marketplaceSlug
		)
	]
);

/** Product metadata is owned by the product module. */
export const products = pgTable(
	'products',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
		marketplaceId: uuid('marketplace_id')
			.notNull()
			.references(() => marketplaces.id),
		externalId: varchar('external_id', { length: 255 }).notNull(),
		url: text('url').notNull(),
		title: text('title').notNull(),
		brand: varchar('brand', { length: 160 }),
		imageUrl: text('image_url'),
		currency: varchar('currency', { length: 3 }).notNull().default('INR'),
		targetPrice: numeric('target_price', { precision: 12, scale: 2 }),
		status: productStatus('status').notNull().default('active'),
		pollingIntervalSeconds: integer('polling_interval_seconds').notNull().default(900),
		nextPollAt: timestamp('next_poll_at', { withTimezone: true }).notNull().defaultNow(),
		lastPolledAt: timestamp('last_polled_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		archivedAt: timestamp('archived_at', { withTimezone: true })
	},
	(table) => [
		index('products_user_id_idx').on(table.userId),
		index('products_marketplace_external_id_idx').on(table.marketplaceId, table.externalId)
	]
);

/** Durable scan jobs allow the worker to recover scheduling after restarts. */
export const scanJobs = pgTable(
	'scan_jobs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' })
			.unique(),
		status: varchar('status', { length: 24 }).notNull().default('pending'),
		runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
		attempts: integer('attempts').notNull().default(0),
		failureCount: integer('failure_count').notNull().default(0),
		lastError: text('last_error'),
		lockedAt: timestamp('locked_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('scan_jobs_status_run_at_idx').on(table.status, table.runAt)]
);

export const productImages = pgTable('product_images', {
	id: uuid('id').defaultRandom().primaryKey(),
	productId: uuid('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	alt: text('alt'),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** User tracking preferences are owned by the watchlist module. */
export const watchlists = pgTable(
	'watchlists',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id'),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		targetPrice: numeric('target_price', { precision: 12, scale: 2 }),
		isPaused: boolean('is_paused').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('watchlists_user_id_idx').on(table.userId),
		index('watchlists_product_id_idx').on(table.productId)
	]
);

/** Immutable observations are owned by the tracker module. */
export const priceHistory = pgTable(
	'price_history',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		price: numeric('price', { precision: 12, scale: 2 }).notNull(),
		listPrice: numeric('list_price', { precision: 12, scale: 2 }),
		currency: varchar('currency', { length: 3 }).notNull(),
		availability: availabilityStatus('availability').notNull().default('unknown'),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({})
	},
	(table) => [index('price_history_product_observed_at_idx').on(table.productId, table.observedAt)]
);

/** The current tracker projection avoids scanning all price observations for common reads. */
export const latestPrices = pgTable('latest_prices', {
	productId: uuid('product_id')
		.primaryKey()
		.references(() => products.id, { onDelete: 'cascade' }),
	price: numeric('price', { precision: 12, scale: 2 }).notNull(),
	listPrice: numeric('list_price', { precision: 12, scale: 2 }),
	currency: varchar('currency', { length: 3 }).notNull(),
	availability: availabilityStatus('availability').notNull().default('unknown'),
	observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow()
});

/** A single-row heartbeat makes worker liveness observable without exposing a worker port. */
export const trackerHeartbeats = pgTable('tracker_heartbeats', {
	name: varchar('name', { length: 64 }).primaryKey(),
	lastSuccessAt: timestamp('last_success_at', { withTimezone: true }).notNull().defaultNow(),
	lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
	lastError: text('last_error')
});

export const notificationChannels = pgTable('notification_channels', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
	provider: notificationProvider('provider').notNull(),
	label: varchar('label', { length: 128 }).notNull(),
	secretReference: text('secret_reference').notNull(),
	isVerified: boolean('is_verified').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const notificationLogs = pgTable(
	'notification_logs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		channelId: uuid('channel_id')
			.notNull()
			.references(() => notificationChannels.id, { onDelete: 'cascade' }),
		watchlistId: uuid('watchlist_id').references(() => watchlists.id),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		priceHistoryId: uuid('price_history_id')
			.notNull()
			.references(() => priceHistory.id, { onDelete: 'cascade' }),
		eventKey: varchar('event_key', { length: 128 }).notNull(),
		eventType: varchar('event_type', { length: 80 }).notNull(),
		status: varchar('status', { length: 32 }).notNull(),
		attempts: integer('attempts').notNull().default(0),
		nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
		attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
		deliveredAt: timestamp('delivered_at', { withTimezone: true }),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({})
	},
	(table) => [
		index('notification_logs_channel_attempted_at_idx').on(table.channelId, table.attemptedAt),
		index('notification_logs_next_attempt_at_idx').on(table.nextAttemptAt),
		uniqueIndex('notification_logs_channel_event_key_unique').on(table.channelId, table.eventKey)
	]
);
