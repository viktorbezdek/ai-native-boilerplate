import { eq, desc, asc, and, count } from "drizzle-orm";
import { db } from "../index";
import { projects, type Project, type NewProject } from "../schema";

export interface GetProjectsOptions {
  userId: string;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}

export interface PaginatedProjects {
  data: Project[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Get a project by ID
 */
export async function getProjectById(id: string): Promise<Project | undefined> {
  const result = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
  return result;
}

/**
 * Get a project by ID for a specific user (ownership check)
 */
export async function getProjectByIdForUser(
  id: string,
  userId: string
): Promise<Project | undefined> {
  const result = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, userId)),
  });
  return result;
}

/**
 * Get all projects for a user with pagination
 */
export async function getProjectsForUser(
  options: GetProjectsOptions
): Promise<PaginatedProjects> {
  const { userId, page = 1, limit = 20, sort = "desc" } = options;
  const offset = (page - 1) * limit;

  const [data, totalResult] = await Promise.all([
    db.query.projects.findMany({
      where: eq(projects.userId, userId),
      limit,
      offset,
      orderBy:
        sort === "desc" ? desc(projects.createdAt) : asc(projects.createdAt),
    }),
    db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.userId, userId)),
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
 * Create a new project
 */
export async function createProject(data: NewProject): Promise<Project> {
  const [project] = await db.insert(projects).values(data).returning();

  if (!project) {
    throw new Error("Failed to create project");
  }

  return project;
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  userId: string,
  data: Partial<Omit<NewProject, "id" | "userId">>
): Promise<Project> {
  const [project] = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();

  if (!project) {
    throw new Error("Project not found or unauthorized");
  }

  return project;
}

/**
 * Delete a project
 */
export async function deleteProject(id: string, userId: string): Promise<void> {
  const result = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));

  if (result.rowCount === 0) {
    throw new Error("Project not found or unauthorized");
  }
}

/**
 * Get project count for a user
 */
export async function getProjectCountForUser(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.userId, userId));

  return result?.count ?? 0;
}
