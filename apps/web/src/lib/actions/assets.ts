"use server";

import {
  createAsset as createAssetQuery,
  deleteAsset as deleteAssetQuery,
  getAssetById,
  getAssetBySlug,
  publishAsset as publishAssetQuery,
  toggleAssetAccess as toggleAssetAccessQuery,
  unpublishAsset as unpublishAssetQuery,
  updateAsset as updateAssetQuery,
} from "@repo/database/queries";
import {
  type CreateAssetInput,
  createAssetSchema,
  generateSlug,
  type UpdateAssetInput,
  updateAssetSchema,
  validateAssetContentSize,
} from "@repo/validations";
import { revalidatePath } from "next/cache";
import { trackServerEvent } from "@/lib/analytics/server";
import { getSession } from "@/lib/auth";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Check if the current user is an admin
 */
async function requireAdmin(): Promise<
  { success: true; userId: string } | { success: false; error: string }
> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if user has admin role
  // The user object from Better Auth includes the role field from our schema
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  return { success: true, userId: session.user.id };
}

/**
 * Create a new asset (admin only)
 */
export async function createAssetAction(
  input: CreateAssetInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return adminCheck;
    }

    const validation = createAssetSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? "Invalid input",
      };
    }

    // Validate content size
    if (
      !validateAssetContentSize(validation.data.content, validation.data.type)
    ) {
      const maxSize = validation.data.type === "agent" ? "5MB" : "500KB";
      return {
        success: false,
        error: `Asset content exceeds maximum size of ${maxSize}`,
      };
    }

    // Generate slug if not provided or check uniqueness
    let slug = validation.data.slug || generateSlug(validation.data.title);

    // Check if slug already exists
    const existing = await getAssetBySlug(slug);
    if (existing) {
      // Append a random suffix
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const asset = await createAssetQuery({
      ...validation.data,
      slug,
    });

    // Track asset creation
    trackServerEvent(adminCheck.userId, "asset_created", {
      asset_id: asset.id,
      asset_title: validation.data.title,
      asset_type: validation.data.type,
      asset_category: validation.data.category,
      is_free: validation.data.isFree,
    });

    revalidatePath("/admin/assets");
    revalidatePath("/catalog");

    return { success: true, data: { id: asset.id, slug: asset.slug } };
  } catch (error) {
    console.error("createAssetAction error:", error);
    return { success: false, error: "Failed to create asset" };
  }
}

/**
 * Update an existing asset (admin only)
 */
export async function updateAssetAction(
  assetId: string,
  input: UpdateAssetInput
): Promise<ActionResult<{ slug: string }>> {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return adminCheck;
    }

    const validation = updateAssetSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? "Invalid input",
      };
    }

    // Validate content size if content is being updated
    if (validation.data.content && validation.data.type) {
      if (
        !validateAssetContentSize(validation.data.content, validation.data.type)
      ) {
        const maxSize = validation.data.type === "agent" ? "5MB" : "500KB";
        return {
          success: false,
          error: `Asset content exceeds maximum size of ${maxSize}`,
        };
      }
    }

    // If slug is being changed, check uniqueness
    if (validation.data.slug) {
      const existing = await getAssetBySlug(validation.data.slug);
      if (existing && existing.id !== assetId) {
        return { success: false, error: "Slug already exists" };
      }
    }

    const asset = await updateAssetQuery(assetId, validation.data);

    // Track asset update
    trackServerEvent(adminCheck.userId, "asset_updated", {
      asset_id: assetId,
    });

    revalidatePath("/admin/assets");
    revalidatePath(`/admin/assets/${assetId}`);
    revalidatePath("/catalog");
    revalidatePath(`/catalog/${asset.slug}`);

    return { success: true, data: { slug: asset.slug } };
  } catch (error) {
    console.error("updateAssetAction error:", error);
    return { success: false, error: "Failed to update asset" };
  }
}

/**
 * Delete an asset (admin only)
 */
export async function deleteAssetAction(
  assetId: string
): Promise<ActionResult> {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return adminCheck;
    }

    // Verify asset exists
    const asset = await getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    await deleteAssetQuery(assetId);

    // Track asset deletion
    trackServerEvent(adminCheck.userId, "asset_deleted", {
      asset_id: assetId,
      asset_title: asset.title,
    });

    revalidatePath("/admin/assets");
    revalidatePath("/catalog");

    return { success: true };
  } catch (error) {
    console.error("deleteAssetAction error:", error);
    return { success: false, error: "Failed to delete asset" };
  }
}

/**
 * Publish an asset (admin only)
 */
export async function publishAssetAction(
  assetId: string
): Promise<ActionResult> {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return adminCheck;
    }

    const asset = await publishAssetQuery(assetId);

    // Track asset publication
    trackServerEvent(adminCheck.userId, "asset_published", {
      asset_id: assetId,
      asset_title: asset.title,
    });

    revalidatePath("/admin/assets");
    revalidatePath(`/admin/assets/${assetId}`);
    revalidatePath("/catalog");
    revalidatePath(`/catalog/${asset.slug}`);

    return { success: true };
  } catch (error) {
    console.error("publishAssetAction error:", error);
    return { success: false, error: "Failed to publish asset" };
  }
}

/**
 * Unpublish an asset (admin only)
 */
export async function unpublishAssetAction(
  assetId: string
): Promise<ActionResult> {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return adminCheck;
    }

    const asset = await unpublishAssetQuery(assetId);

    // Track asset unpublication
    trackServerEvent(adminCheck.userId, "asset_unpublished", {
      asset_id: assetId,
      asset_title: asset.title,
    });

    revalidatePath("/admin/assets");
    revalidatePath(`/admin/assets/${assetId}`);
    revalidatePath("/catalog");
    revalidatePath(`/catalog/${asset.slug}`);

    return { success: true };
  } catch (error) {
    console.error("unpublishAssetAction error:", error);
    return { success: false, error: "Failed to unpublish asset" };
  }
}

/**
 * Toggle asset access level between free and subscriber-only (admin only)
 */
export async function toggleAssetAccessAction(
  assetId: string
): Promise<ActionResult<{ isFree: boolean }>> {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return adminCheck;
    }

    const asset = await toggleAssetAccessQuery(assetId);

    // Track access level change
    trackServerEvent(adminCheck.userId, "asset_access_toggled", {
      asset_id: assetId,
      is_free: asset.isFree,
    });

    revalidatePath("/admin/assets");
    revalidatePath(`/admin/assets/${assetId}`);
    revalidatePath("/catalog");
    revalidatePath(`/catalog/${asset.slug}`);

    return { success: true, data: { isFree: asset.isFree } };
  } catch (error) {
    console.error("toggleAssetAccessAction error:", error);
    return { success: false, error: "Failed to toggle asset access" };
  }
}

/**
 * Duplicate an asset (admin only)
 */
export async function duplicateAssetAction(
  assetId: string
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return adminCheck;
    }

    // Get the original asset
    const original = await getAssetById(assetId);
    if (!original) {
      return { success: false, error: "Asset not found" };
    }

    // Generate new slug
    const newSlug = `${original.slug}-copy-${Date.now().toString(36)}`;

    // Create the duplicate
    const duplicate = await createAssetQuery({
      title: `${original.title} (Copy)`,
      slug: newSlug,
      description: original.description,
      content: original.content,
      type: original.type,
      category: original.category,
      modelCompatibility: original.modelCompatibility,
      sampleInput: original.sampleInput,
      sampleOutput: original.sampleOutput,
      isFree: original.isFree,
      isPublished: false, // Start unpublished
      tags: original.tags ?? [],
      version: "1.0.0",
    });

    // Track duplication
    trackServerEvent(adminCheck.userId, "asset_duplicated", {
      original_asset_id: assetId,
      new_asset_id: duplicate.id,
    });

    revalidatePath("/admin/assets");

    return { success: true, data: { id: duplicate.id, slug: duplicate.slug } };
  } catch (error) {
    console.error("duplicateAssetAction error:", error);
    return { success: false, error: "Failed to duplicate asset" };
  }
}
