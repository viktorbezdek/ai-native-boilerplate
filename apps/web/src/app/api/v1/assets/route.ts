import {
  getAssetStats,
  getAssets,
  getPopularAssets,
  getRecentAssets,
  searchAssets,
} from "@repo/database/queries";
import {
  assetFilterSchema,
  assetSearchSchema,
  createErrorResponse,
  createSuccessResponse,
} from "@repo/validations";
import type { NextRequest } from "next/server";
import { applyApiMiddleware } from "@/lib/api";

/**
 * GET /api/v1/assets - Browse public catalog
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - sort: "newest" | "oldest" | "popular" | "downloads"
 * - type: "prompt" | "chain" | "skill" | "agent"
 * - category: productivity, writing, coding, etc.
 * - isFree: "true" to filter free only
 * - search: search query string
 * - models: comma-separated model compatibility filters
 *
 * Special query modes:
 * - mode=popular - Returns most popular assets
 * - mode=recent - Returns most recently published assets
 * - mode=stats - Returns catalog statistics
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting (no auth required for public catalog)
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "standard",
    csrf: false,
    routePrefix: "assets",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("mode");

    // Handle special modes
    if (mode === "stats") {
      const stats = await getAssetStats();
      return createSuccessResponse(stats);
    }

    if (mode === "popular") {
      const limit = Math.min(
        50,
        Math.max(1, Number.parseInt(searchParams.get("limit") ?? "10", 10))
      );
      const assets = await getPopularAssets(limit);
      return createSuccessResponse(assets);
    }

    if (mode === "recent") {
      const limit = Math.min(
        50,
        Math.max(1, Number.parseInt(searchParams.get("limit") ?? "10", 10))
      );
      const assets = await getRecentAssets(limit);
      return createSuccessResponse(assets);
    }

    if (mode === "search") {
      const validation = assetSearchSchema.safeParse({
        query: searchParams.get("query") ?? searchParams.get("q"),
        limit: searchParams.get("limit"),
        type: searchParams.get("type"),
        category: searchParams.get("category"),
        isFree:
          searchParams.get("isFree") === "true"
            ? true
            : searchParams.get("isFree") === "false"
              ? false
              : undefined,
      });

      if (!validation.success) {
        return createErrorResponse(
          "Invalid search parameters",
          400,
          validation.error.issues
        );
      }

      const { query, ...options } = validation.data;
      const assets = await searchAssets(query, options);
      return createSuccessResponse(assets);
    }

    // Standard browse mode with filters
    const validation = assetFilterSchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sort: searchParams.get("sort"),
      type: searchParams.get("type"),
      category: searchParams.get("category"),
      isFree: searchParams.get("isFree"),
      search: searchParams.get("search"),
      models: searchParams.get("models"),
    });

    if (!validation.success) {
      return createErrorResponse(
        "Invalid filter parameters",
        400,
        validation.error.issues
      );
    }

    const { page, limit, sort, type, category, isFree, search, models } =
      validation.data;

    const result = await getAssets({
      page,
      limit,
      sort,
      type,
      category,
      isFree,
      isPublished: true, // Always filter to published only for public API
      search,
      models,
    });

    // Strip content from list response (users need to fetch individual asset)
    const dataWithoutContent = result.data.map((asset) => ({
      ...asset,
      content: undefined, // Remove full content from list view
    }));

    return createSuccessResponse(dataWithoutContent, result.meta);
  } catch (error) {
    console.error("GET /api/v1/assets error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
