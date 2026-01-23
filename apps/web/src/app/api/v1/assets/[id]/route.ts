import {
  getAssetById,
  getPublishedAssetBySlug,
  incrementViewCount,
  trackAssetAccess,
  trackUserView,
} from "@repo/database/queries";
import { createErrorResponse, createSuccessResponse } from "@repo/validations";
import type { NextRequest } from "next/server";
import { applyApiMiddleware } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/assets/[id] - Get a single asset by ID or slug
 *
 * Access control:
 * - Free assets: Full content available to all
 * - Subscriber assets: Preview available to all, full content requires subscription
 *
 * The ID parameter can be either:
 * - A UUID (asset ID)
 * - A slug (url-friendly identifier)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  // Apply rate limiting
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "standard",
    csrf: false,
    routePrefix: "assets",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    const { id } = await context.params;

    // Try to find asset by ID first, then by slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    let asset: Awaited<ReturnType<typeof getAssetById>> | undefined;
    if (isUuid) {
      asset = await getAssetById(id);
      // Only return if published (or user is admin - future enhancement)
      if (asset && !asset.isPublished) {
        asset = undefined;
      }
    } else {
      // Look up by slug - only returns published assets
      asset = await getPublishedAssetBySlug(id);
    }

    if (!asset) {
      return createErrorResponse("Asset not found", 404);
    }

    // Get current user session (optional)
    const session = await getSession();
    const userId = session?.user?.id;

    // Track view (async, don't await)
    incrementViewCount(asset.id).catch(console.error);

    if (userId) {
      // Track user's view history and access
      trackUserView(userId, asset.id).catch(console.error);
      trackAssetAccess({
        assetId: asset.id,
        userId,
        accessType: "view",
      }).catch(console.error);
    }

    // Determine if user has full access
    let hasFullAccess = asset.isFree;

    if (!hasFullAccess && userId) {
      // Check if user has active subscription
      hasFullAccess = await hasActiveSubscription(userId);
    }

    // Build response based on access level
    if (hasFullAccess) {
      // Return full asset with content
      return createSuccessResponse({
        ...asset,
        hasFullAccess: true,
      });
    }

    // Return preview without full content
    return createSuccessResponse({
      id: asset.id,
      title: asset.title,
      slug: asset.slug,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      modelCompatibility: asset.modelCompatibility,
      sampleInput: asset.sampleInput,
      sampleOutput: asset.sampleOutput,
      isFree: asset.isFree,
      viewCount: asset.viewCount,
      downloadCount: asset.downloadCount,
      tags: asset.tags,
      version: asset.version,
      publishedAt: asset.publishedAt,
      createdAt: asset.createdAt,
      // Content is omitted for non-subscribers
      content: null,
      hasFullAccess: false,
      requiresSubscription: true,
    });
  } catch (error) {
    console.error("GET /api/v1/assets/[id] error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
