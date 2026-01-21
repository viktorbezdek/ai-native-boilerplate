import { z } from "zod";

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  isPublic: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// API Response types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  error: string;
  code?: string;
  details?: z.ZodIssue[];
}

// Helper to create error response
export function createErrorResponse(
  message: string,
  status: number,
  details?: z.ZodIssue[]
): Response {
  const body: ApiError = { error: message };
  if (details) {
    body.details = details;
  }
  return Response.json(body, { status });
}

// Helper to create success response
export function createSuccessResponse<T>(
  data: T,
  meta?: ApiResponse<T>["meta"]
): Response {
  const body: ApiResponse<T> = { data };
  if (meta) {
    body.meta = meta;
  }
  return Response.json(body);
}
