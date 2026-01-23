import {
  getAssetById,
  getPublishedAssetBySlug,
  incrementDownloadCount,
  trackAssetAccess,
} from "@repo/database/queries";
import { assetDownloadSchema, createErrorResponse } from "@repo/validations";
import type { NextRequest } from "next/server";
import * as yaml from "yaml";
import { applyApiMiddleware } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/assets/[id]/download - Download asset content
 *
 * Query params:
 * - format: "json" | "yaml" | "txt" (default: json)
 *
 * Access control:
 * - Free assets: Available to all authenticated users
 * - Subscriber assets: Requires active subscription
 */
export async function GET(request: NextRequest, context: RouteContext) {
  // Apply strict rate limiting for downloads
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "strict",
    csrf: false,
    routePrefix: "assets-download",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    // Require authentication for downloads
    const session = await getSession();
    if (!session?.user?.id) {
      return createErrorResponse(
        "Authentication required to download assets",
        401
      );
    }

    const userId = session.user.id;
    const { id } = await context.params;

    // Validate format parameter
    const searchParams = request.nextUrl.searchParams;
    const validation = assetDownloadSchema.safeParse({
      format: searchParams.get("format"),
    });

    if (!validation.success) {
      return createErrorResponse(
        "Invalid format parameter",
        400,
        validation.error.issues
      );
    }

    const { format } = validation.data;

    // Try to find asset by ID first, then by slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    let asset: Awaited<ReturnType<typeof getAssetById>> | undefined;
    if (isUuid) {
      asset = await getAssetById(id);
      if (asset && !asset.isPublished) {
        asset = undefined;
      }
    } else {
      asset = await getPublishedAssetBySlug(id);
    }

    if (!asset) {
      return createErrorResponse("Asset not found", 404);
    }

    // Check access permissions
    const canAccess = asset.isFree || (await hasActiveSubscription(userId));

    if (!canAccess) {
      return createErrorResponse(
        "Subscription required to download this asset",
        403
      );
    }

    // Track download
    incrementDownloadCount(asset.id).catch(console.error);
    trackAssetAccess({
      assetId: asset.id,
      userId,
      accessType: "download",
    }).catch(console.error);

    // Format content based on requested format
    let content: string;
    let contentType: string;
    let fileExtension: string;

    const assetData = {
      title: asset.title,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      modelCompatibility: asset.modelCompatibility,
      version: asset.version,
      content: asset.content,
      tags: asset.tags,
    };

    switch (format) {
      case "yaml":
        content = yaml.stringify(assetData);
        contentType = "application/x-yaml";
        fileExtension = "yaml";
        break;

      case "txt": {
        // For text format, extract the main prompt text
        const textContent = extractTextContent(asset.content);
        content = `# ${asset.title}\n\n${asset.description}\n\n---\n\n${textContent}`;
        contentType = "text/plain";
        fileExtension = "txt";
        break;
      }

      default:
        content = JSON.stringify(assetData, null, 2);
        contentType = "application/json";
        fileExtension = "json";
        break;
    }

    // Return as downloadable file
    const filename = `${asset.slug}.${fileExtension}`;

    return new Response(content, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("GET /api/v1/assets/[id]/download error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

/**
 * Extract readable text content from asset content object
 */
function extractTextContent(content: unknown): string {
  if (!content || typeof content !== "object") {
    return String(content ?? "");
  }

  const c = content as Record<string, unknown>;
  const parts: string[] = [];

  // Handle different content structures
  if (c.text && typeof c.text === "string") {
    parts.push(c.text);
  }

  if (c.systemPrompt && typeof c.systemPrompt === "string") {
    parts.push(`## System Prompt\n\n${c.systemPrompt}`);
  }

  if (c.userPrompt && typeof c.userPrompt === "string") {
    parts.push(`## User Prompt\n\n${c.userPrompt}`);
  }

  if (Array.isArray(c.steps)) {
    parts.push("## Steps\n");
    for (const step of c.steps) {
      if (step && typeof step === "object") {
        const s = step as Record<string, unknown>;
        parts.push(`### ${s.name ?? "Step"}\n\n${s.prompt ?? ""}`);
      }
    }
  }

  if (Array.isArray(c.tools)) {
    parts.push("## Tools\n");
    for (const tool of c.tools) {
      if (tool && typeof tool === "object") {
        const t = tool as Record<string, unknown>;
        parts.push(`### ${t.name ?? "Tool"}\n\n${t.description ?? ""}`);
      }
    }
  }

  return parts.join("\n\n") || JSON.stringify(content, null, 2);
}
