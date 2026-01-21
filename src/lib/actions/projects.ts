"use server";

import { trackServerEvent } from "@/lib/analytics/server";
import { getSession } from "@/lib/auth";
import {
  createProject as createProjectQuery,
  deleteProject as deleteProjectQuery,
  getProjectByIdForUser,
  updateProject as updateProjectQuery,
} from "@/lib/db/queries";
import {
  type CreateProjectInput,
  type UpdateProjectInput,
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Create a new project
 */
export async function createProjectAction(
  input: CreateProjectInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validation = createProjectSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const project = await createProjectQuery({
      ...validation.data,
      userId: session.user.id,
    });

    // Track project creation
    trackServerEvent(session.user.id, "project_created", {
      project_id: project.id,
      project_name: validation.data.name,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");

    return { success: true, data: { id: project.id } };
  } catch (error) {
    console.error("createProjectAction error:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/**
 * Update an existing project
 */
export async function updateProjectAction(
  projectId: string,
  input: UpdateProjectInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validation = updateProjectSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? "Invalid input",
      };
    }

    await updateProjectQuery(projectId, session.user.id, validation.data);

    // Track project update
    trackServerEvent(session.user.id, "project_updated", {
      project_id: projectId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateProjectAction error:", error);
    return { success: false, error: "Failed to update project" };
  }
}

/**
 * Delete a project
 */
export async function deleteProjectAction(
  projectId: string
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership before deletion
    const project = await getProjectByIdForUser(projectId, session.user.id);
    if (!project) {
      return { success: false, error: "Project not found" };
    }

    await deleteProjectQuery(projectId, session.user.id);

    // Track project deletion
    trackServerEvent(session.user.id, "project_deleted", {
      project_id: projectId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");

    return { success: true };
  } catch (error) {
    console.error("deleteProjectAction error:", error);
    return { success: false, error: "Failed to delete project" };
  }
}
