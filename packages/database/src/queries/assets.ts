import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../index";
import {
  type Asset,
  type AssetCategory,
  type AssetType,
  assetAccess,
  assets,
  type NewAsset,
  type NewAssetAccess,
  userRecentlyViewed,
} from "../schema";

// ============================================================================
// Types
// ============================================================================

export interface GetAssetsOptions {
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "popular" | "downloads";
  type?: AssetType;
  category?: AssetCategory;
  isFree?: boolean;
  isPublished?: boolean;
  search?: string;
  models?: string[];
}

export interface PaginatedAssets {
  data: Asset[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Asset CRUD
// ============================================================================

/**
 * Get an asset by ID
 */
export async function getAssetById(id: string): Promise<Asset | undefined> {
  const result = await db.query.assets.findFirst({
    where: eq(assets.id, id),
  });
  return result;
}

/**
 * Get an asset by slug
 */
export async function getAssetBySlug(slug: string): Promise<Asset | undefined> {
  const result = await db.query.assets.findFirst({
    where: eq(assets.slug, slug),
  });
  return result;
}

/**
 * Get a published asset by slug (for public access)
 */
export async function getPublishedAssetBySlug(
  slug: string
): Promise<Asset | undefined> {
  const result = await db.query.assets.findFirst({
    where: and(eq(assets.slug, slug), eq(assets.isPublished, true)),
  });
  return result;
}

/**
 * Get all assets with filtering and pagination
 */
export async function getAssets(
  options: GetAssetsOptions = {}
): Promise<PaginatedAssets> {
  const {
    page = 1,
    limit = 20,
    sort = "newest",
    type,
    category,
    isFree,
    isPublished = true,
    search,
    models,
  } = options;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (isPublished !== undefined) {
    conditions.push(eq(assets.isPublished, isPublished));
  }

  if (type) {
    conditions.push(eq(assets.type, type));
  }

  if (category) {
    conditions.push(eq(assets.category, category));
  }

  if (isFree !== undefined) {
    conditions.push(eq(assets.isFree, isFree));
  }

  if (search) {
    conditions.push(
      or(
        ilike(assets.title, `%${search}%`),
        ilike(assets.description, `%${search}%`)
      )
    );
  }

  if (models && models.length > 0) {
    // Check if any of the requested models are in the modelCompatibility array
    conditions.push(
      sql`${assets.modelCompatibility} && ARRAY[${sql.join(
        models.map((m) => sql`${m}`),
        sql`, `
      )}]::text[]`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build order by based on sort parameter
  const orderBy =
    sort === "oldest"
      ? asc(assets.createdAt)
      : sort === "popular"
        ? desc(assets.viewCount)
        : sort === "downloads"
          ? desc(assets.downloadCount)
          : desc(assets.createdAt);

  const [data, totalResult] = await Promise.all([
    db.query.assets.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy,
    }),
    db.select({ count: count() }).from(assets).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      hasMore: offset + data.length < total,
    },
  };
}

/**
 * Get recently added published assets
 */
export async function getRecentAssets(limit = 10): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: eq(assets.isPublished, true),
    limit,
    orderBy: desc(assets.publishedAt),
  });
}

/**
 * Get free published assets
 */
export async function getFreeAssets(limit = 20): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: and(eq(assets.isPublished, true), eq(assets.isFree, true)),
    limit,
    orderBy: desc(assets.publishedAt),
  });
}

/**
 * Create a new asset
 */
export async function createAsset(data: NewAsset): Promise<Asset> {
  const [asset] = await db.insert(assets).values(data).returning();

  if (!asset) {
    throw new Error("Failed to create asset");
  }

  return asset;
}

/**
 * Update an asset
 */
export async function updateAsset(
  id: string,
  data: Partial<Omit<NewAsset, "id">>
): Promise<Asset> {
  const [asset] = await db
    .update(assets)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id))
    .returning();

  if (!asset) {
    throw new Error("Asset not found");
  }

  return asset;
}

/**
 * Delete an asset
 */
export async function deleteAsset(id: string): Promise<void> {
  const result = await db.delete(assets).where(eq(assets.id, id));

  if (result.rowCount === 0) {
    throw new Error("Asset not found");
  }
}

/**
 * Publish an asset
 */
export async function publishAsset(id: string): Promise<Asset> {
  const [asset] = await db
    .update(assets)
    .set({
      isPublished: true,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id))
    .returning();

  if (!asset) {
    throw new Error("Asset not found");
  }

  return asset;
}

/**
 * Unpublish an asset
 */
export async function unpublishAsset(id: string): Promise<Asset> {
  const [asset] = await db
    .update(assets)
    .set({
      isPublished: false,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id))
    .returning();

  if (!asset) {
    throw new Error("Asset not found");
  }

  return asset;
}

/**
 * Toggle asset free/subscriber access
 */
export async function toggleAssetAccess(id: string): Promise<Asset> {
  // First get current state
  const current = await getAssetById(id);
  if (!current) {
    throw new Error("Asset not found");
  }

  const [asset] = await db
    .update(assets)
    .set({
      isFree: !current.isFree,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id))
    .returning();

  if (!asset) {
    throw new Error("Failed to toggle asset access");
  }

  return asset;
}

// ============================================================================
// Asset Stats
// ============================================================================

/**
 * Increment view count
 */
export async function incrementViewCount(id: string): Promise<void> {
  await db
    .update(assets)
    .set({
      viewCount: sql`${assets.viewCount} + 1`,
    })
    .where(eq(assets.id, id));
}

/**
 * Increment download count
 */
export async function incrementDownloadCount(id: string): Promise<void> {
  await db
    .update(assets)
    .set({
      downloadCount: sql`${assets.downloadCount} + 1`,
    })
    .where(eq(assets.id, id));
}

/**
 * Get asset statistics
 */
export async function getAssetStats(): Promise<{
  total: number;
  published: number;
  free: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const [totalResult, publishedResult, freeResult] = await Promise.all([
    db.select({ count: count() }).from(assets),
    db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.isPublished, true)),
    db
      .select({ count: count() })
      .from(assets)
      .where(and(eq(assets.isPublished, true), eq(assets.isFree, true))),
  ]);

  // Get counts by type
  const typeResults = await db
    .select({
      type: assets.type,
      count: count(),
    })
    .from(assets)
    .where(eq(assets.isPublished, true))
    .groupBy(assets.type);

  // Get counts by category
  const categoryResults = await db
    .select({
      category: assets.category,
      count: count(),
    })
    .from(assets)
    .where(eq(assets.isPublished, true))
    .groupBy(assets.category);

  const byType: Record<string, number> = {};
  for (const row of typeResults) {
    byType[row.type] = row.count;
  }

  const byCategory: Record<string, number> = {};
  for (const row of categoryResults) {
    byCategory[row.category] = row.count;
  }

  return {
    total: totalResult[0]?.count ?? 0,
    published: publishedResult[0]?.count ?? 0,
    free: freeResult[0]?.count ?? 0,
    byType,
    byCategory,
  };
}

// ============================================================================
// Access Tracking
// ============================================================================

/**
 * Track asset access (view, download, copy)
 */
export async function trackAssetAccess(data: NewAssetAccess): Promise<void> {
  await db.insert(assetAccess).values(data);
}

/**
 * Get popular assets by view count
 */
export async function getPopularAssets(limit = 10): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: eq(assets.isPublished, true),
    limit,
    orderBy: desc(assets.viewCount),
  });
}

/**
 * Get most downloaded assets
 */
export async function getMostDownloadedAssets(limit = 10): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: eq(assets.isPublished, true),
    limit,
    orderBy: desc(assets.downloadCount),
  });
}

// ============================================================================
// User Recently Viewed
// ============================================================================

/**
 * Track that a user viewed an asset
 * Uses upsert to update viewedAt if already exists
 */
export async function trackUserView(
  userId: string,
  assetId: string
): Promise<void> {
  // First try to find existing record
  const existing = await db.query.userRecentlyViewed.findFirst({
    where: and(
      eq(userRecentlyViewed.userId, userId),
      eq(userRecentlyViewed.assetId, assetId)
    ),
  });

  if (existing) {
    // Update existing record
    await db
      .update(userRecentlyViewed)
      .set({ viewedAt: new Date() })
      .where(eq(userRecentlyViewed.id, existing.id));
  } else {
    // Insert new record
    await db.insert(userRecentlyViewed).values({
      userId,
      assetId,
    });

    // Clean up old records (keep only last 20)
    const allViews = await db.query.userRecentlyViewed.findMany({
      where: eq(userRecentlyViewed.userId, userId),
      orderBy: desc(userRecentlyViewed.viewedAt),
    });

    if (allViews.length > 20) {
      const toDelete = allViews.slice(20).map((v) => v.id);
      await db
        .delete(userRecentlyViewed)
        .where(inArray(userRecentlyViewed.id, toDelete));
    }
  }
}

/**
 * Get recently viewed assets for a user
 */
export async function getRecentlyViewedAssets(
  userId: string,
  limit = 10
): Promise<Asset[]> {
  const recentViews = await db.query.userRecentlyViewed.findMany({
    where: eq(userRecentlyViewed.userId, userId),
    orderBy: desc(userRecentlyViewed.viewedAt),
    limit,
    with: {
      asset: true,
    },
  });

  // Filter out any unpublished assets and return just the assets
  return recentViews
    .filter((v) => v.asset?.isPublished)
    .map((v) => v.asset as Asset);
}

// ============================================================================
// Search
// ============================================================================

/**
 * Search assets by text query
 */
export async function searchAssets(
  query: string,
  options: {
    limit?: number;
    type?: AssetType;
    category?: AssetCategory;
    isFree?: boolean;
  } = {}
): Promise<Asset[]> {
  const { limit = 20, type, category, isFree } = options;

  const conditions = [
    eq(assets.isPublished, true),
    or(
      ilike(assets.title, `%${query}%`),
      ilike(assets.description, `%${query}%`),
      sql`${assets.tags}::text ILIKE ${`%${query}%`}`
    ),
  ];

  if (type) {
    conditions.push(eq(assets.type, type));
  }

  if (category) {
    conditions.push(eq(assets.category, category));
  }

  if (isFree !== undefined) {
    conditions.push(eq(assets.isFree, isFree));
  }

  return db.query.assets.findMany({
    where: and(...conditions),
    limit,
    orderBy: desc(assets.viewCount), // Order by popularity for search results
  });
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
  query: string,
  limit = 5
): Promise<{ title: string; slug: string }[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const results = await db
    .select({
      title: assets.title,
      slug: assets.slug,
    })
    .from(assets)
    .where(and(eq(assets.isPublished, true), ilike(assets.title, `%${query}%`)))
    .limit(limit)
    .orderBy(desc(assets.viewCount));

  return results;
}

// ============================================================================
// Admin Dashboard Metrics
// ============================================================================

/**
 * Get comprehensive dashboard metrics for admin
 */
export async function getAdminDashboardMetrics(): Promise<{
  totalAssets: number;
  publishedAssets: number;
  draftAssets: number;
  freeAssets: number;
  paidAssets: number;
  totalViews: number;
  totalDownloads: number;
  byType: Record<string, { count: number; views: number; downloads: number }>;
  byCategory: Record<
    string,
    { count: number; views: number; downloads: number }
  >;
  topPerformers: {
    id: string;
    title: string;
    slug: string;
    type: string;
    viewCount: number;
    downloadCount: number;
  }[];
  recentAssets: {
    id: string;
    title: string;
    slug: string;
    type: string;
    isPublished: boolean;
    createdAt: Date;
  }[];
}> {
  // Basic counts
  const [
    totalResult,
    publishedResult,
    freeResult,
    viewsResult,
    downloadsResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(assets),
    db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.isPublished, true)),
    db
      .select({ count: count() })
      .from(assets)
      .where(and(eq(assets.isPublished, true), eq(assets.isFree, true))),
    db
      .select({ total: sql<number>`COALESCE(SUM(${assets.viewCount}), 0)` })
      .from(assets),
    db
      .select({ total: sql<number>`COALESCE(SUM(${assets.downloadCount}), 0)` })
      .from(assets),
  ]);

  const totalAssets = totalResult[0]?.count ?? 0;
  const publishedAssets = publishedResult[0]?.count ?? 0;
  const freeAssets = freeResult[0]?.count ?? 0;

  // By type with stats
  const typeStats = await db
    .select({
      type: assets.type,
      count: count(),
      views: sql<number>`COALESCE(SUM(${assets.viewCount}), 0)`,
      downloads: sql<number>`COALESCE(SUM(${assets.downloadCount}), 0)`,
    })
    .from(assets)
    .groupBy(assets.type);

  const byType: Record<
    string,
    { count: number; views: number; downloads: number }
  > = {};
  for (const row of typeStats) {
    byType[row.type] = {
      count: row.count,
      views: Number(row.views),
      downloads: Number(row.downloads),
    };
  }

  // By category with stats
  const categoryStats = await db
    .select({
      category: assets.category,
      count: count(),
      views: sql<number>`COALESCE(SUM(${assets.viewCount}), 0)`,
      downloads: sql<number>`COALESCE(SUM(${assets.downloadCount}), 0)`,
    })
    .from(assets)
    .groupBy(assets.category);

  const byCategory: Record<
    string,
    { count: number; views: number; downloads: number }
  > = {};
  for (const row of categoryStats) {
    byCategory[row.category] = {
      count: row.count,
      views: Number(row.views),
      downloads: Number(row.downloads),
    };
  }

  // Top performers by engagement (views + downloads)
  const topPerformers = await db
    .select({
      id: assets.id,
      title: assets.title,
      slug: assets.slug,
      type: assets.type,
      viewCount: assets.viewCount,
      downloadCount: assets.downloadCount,
    })
    .from(assets)
    .where(eq(assets.isPublished, true))
    .orderBy(desc(sql`${assets.viewCount} + ${assets.downloadCount}`))
    .limit(5);

  // Recent assets
  const recentAssets = await db
    .select({
      id: assets.id,
      title: assets.title,
      slug: assets.slug,
      type: assets.type,
      isPublished: assets.isPublished,
      createdAt: assets.createdAt,
    })
    .from(assets)
    .orderBy(desc(assets.createdAt))
    .limit(5);

  return {
    totalAssets,
    publishedAssets,
    draftAssets: totalAssets - publishedAssets,
    freeAssets,
    paidAssets: publishedAssets - freeAssets,
    totalViews: Number(viewsResult[0]?.total ?? 0),
    totalDownloads: Number(downloadsResult[0]?.total ?? 0),
    byType,
    byCategory,
    topPerformers,
    recentAssets,
  };
}

/**
 * Get asset access history for admin
 */
export async function getAssetAccessHistory(limit = 20): Promise<
  {
    id: string;
    assetId: string;
    userId: string;
    accessType: string;
    accessedAt: Date;
    assetTitle: string;
  }[]
> {
  const results = await db
    .select({
      id: assetAccess.id,
      assetId: assetAccess.assetId,
      userId: assetAccess.userId,
      accessType: assetAccess.accessType,
      accessedAt: assetAccess.createdAt,
      assetTitle: assets.title,
    })
    .from(assetAccess)
    .leftJoin(assets, eq(assetAccess.assetId, assets.id))
    .orderBy(desc(assetAccess.createdAt))
    .limit(limit);

  return results.map((r) => ({
    ...r,
    assetTitle: r.assetTitle ?? "Unknown Asset",
  }));
}
