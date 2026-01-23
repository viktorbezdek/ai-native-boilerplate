import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================================================
// Enums
// ============================================================================

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
]);

// Asset enums
export const assetTypeEnum = pgEnum("asset_type", [
  "prompt",
  "chain",
  "skill",
  "agent",
]);

export const assetCategoryEnum = pgEnum("asset_category", [
  "productivity",
  "writing",
  "coding",
  "analysis",
  "creative",
  "business",
  "education",
  "other",
]);

export const modelCompatibilityEnum = pgEnum("model_compatibility", [
  "openai",
  "anthropic",
  "google",
  "open-source",
  "universal",
]);

export const accessTypeEnum = pgEnum("access_type", [
  "view",
  "download",
  "copy",
]);

// ============================================================================
// Users
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_users_email").on(table.email)]
);

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  subscription: one(subscriptions),
  projects: many(projects),
  assetAccess: many(assetAccess),
  recentlyViewed: many(userRecentlyViewed),
}));

// ============================================================================
// Auth - Sessions
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_token").on(table.token),
  ]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// Auth - Accounts (OAuth)
// ============================================================================

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_accounts_user_id").on(table.userId)]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// Auth - Verification Tokens
// ============================================================================

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================================================
// Subscriptions (Stripe)
// ============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    stripeProductId: text("stripe_product_id"),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    trialStart: timestamp("trial_start", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_subscriptions_stripe_customer").on(table.stripeCustomerId),
    index("idx_subscriptions_user_id").on(table.userId),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// Projects
// ============================================================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_projects_user_id").on(table.userId)]
);

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// Assets (AI Marketplace)
// ============================================================================

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Basic info
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    // Content stored as JSONB for flexibility
    content: jsonb("content").notNull(),
    // Classification
    type: assetTypeEnum("type").notNull(),
    category: assetCategoryEnum("category").notNull(),
    // Model compatibility (array of compatible models)
    modelCompatibility: text("model_compatibility").array().notNull(),
    // Sample usage
    sampleInput: text("sample_input"),
    sampleOutput: text("sample_output"),
    // Access control
    isFree: boolean("is_free").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    // Stats
    viewCount: integer("view_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    // Metadata
    tags: text("tags").array().default([]),
    version: text("version").notNull().default("1.0.0"),
    // Timestamps
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_assets_slug").on(table.slug),
    index("idx_assets_type").on(table.type),
    index("idx_assets_category").on(table.category),
    index("idx_assets_is_free").on(table.isFree),
    index("idx_assets_is_published").on(table.isPublished),
    index("idx_assets_published_at").on(table.publishedAt),
  ]
);

// ============================================================================
// Asset Access Tracking
// ============================================================================

export const assetAccess = pgTable(
  "asset_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    accessType: accessTypeEnum("access_type").notNull(),
    format: text("format"), // json, yaml, txt for downloads
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_asset_access_user_id").on(table.userId),
    index("idx_asset_access_asset_id").on(table.assetId),
    index("idx_asset_access_user_asset").on(table.userId, table.assetId),
  ]
);

export const assetAccessRelations = relations(assetAccess, ({ one }) => ({
  user: one(users, {
    fields: [assetAccess.userId],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [assetAccess.assetId],
    references: [assets.id],
  }),
}));

// ============================================================================
// User Recently Viewed (for dashboard)
// ============================================================================

export const userRecentlyViewed = pgTable(
  "user_recently_viewed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_user_recently_viewed_user_id").on(table.userId),
    index("idx_user_recently_viewed_user_asset").on(
      table.userId,
      table.assetId
    ),
  ]
);

export const userRecentlyViewedRelations = relations(
  userRecentlyViewed,
  ({ one }) => ({
    user: one(users, {
      fields: [userRecentlyViewed.userId],
      references: [users.id],
    }),
    asset: one(assets, {
      fields: [userRecentlyViewed.assetId],
      references: [assets.id],
    }),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

// Asset types
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetAccess = typeof assetAccess.$inferSelect;
export type NewAssetAccess = typeof assetAccess.$inferInsert;
export type UserRecentlyViewed = typeof userRecentlyViewed.$inferSelect;
export type NewUserRecentlyViewed = typeof userRecentlyViewed.$inferInsert;

// Enum value types
export type AssetType = (typeof assetTypeEnum.enumValues)[number];
export type AssetCategory = (typeof assetCategoryEnum.enumValues)[number];
export type ModelCompatibility =
  (typeof modelCompatibilityEnum.enumValues)[number];
export type AccessType = (typeof accessTypeEnum.enumValues)[number];
