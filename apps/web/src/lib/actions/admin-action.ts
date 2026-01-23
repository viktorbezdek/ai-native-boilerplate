import { getSession } from "@/lib/auth";

/**
 * Standard action result type
 */
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Context passed to admin action handlers
 */
export interface AdminActionContext<TInput = void> {
  userId: string;
  input: TInput;
}

/**
 * Admin action handler function type
 */
export type AdminActionHandler<TResult, TInput = void> = (
  context: AdminActionContext<TInput>
) => Promise<ActionResult<TResult>>;

/**
 * Higher-order function that wraps an action with admin authentication check
 * and error handling
 *
 * @param actionName - Name of the action for error logging
 * @param handler - The actual action logic to execute
 * @returns A function that checks admin status before executing the handler
 *
 * @example
 * ```ts
 * export const deleteAssetAction = withAdminAction(
 *   "deleteAsset",
 *   async ({ userId, input: assetId }) => {
 *     const asset = await getAssetById(assetId);
 *     if (!asset) {
 *       return { success: false, error: "Asset not found" };
 *     }
 *     await deleteAssetQuery(assetId);
 *     trackServerEvent(userId, "asset_deleted", { asset_id: assetId });
 *     revalidatePath("/admin/assets");
 *     return { success: true };
 *   }
 * );
 * ```
 */
export function withAdminAction<TResult, TInput = void>(
  actionName: string,
  handler: AdminActionHandler<TResult, TInput>
): (input?: TInput) => Promise<ActionResult<TResult>> {
  return async (input?: TInput): Promise<ActionResult<TResult>> => {
    try {
      const session = await getSession();

      if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
      }

      // Check if user has admin role
      const user = session.user as { id: string; role?: string };
      if (user.role !== "admin") {
        return { success: false, error: "Admin access required" };
      }

      return await handler({
        userId: session.user.id,
        input: input as TInput,
      });
    } catch (error) {
      console.error(`${actionName} error:`, error);
      return { success: false, error: `${actionName} failed` };
    }
  };
}
