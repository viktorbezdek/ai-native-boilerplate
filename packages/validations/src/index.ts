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

// ============================================================================
// Asset Schemas
// ============================================================================

// Asset type and category enums (must match database)
export const assetTypeValues = ["prompt", "chain", "skill", "agent"] as const;
export const assetCategoryValues = [
  "productivity",
  "writing",
  "coding",
  "analysis",
  "creative",
  "business",
  "education",
  "other",
] as const;
export const modelCompatibilityValues = [
  "openai",
  "anthropic",
  "google",
  "open-source",
  "universal",
] as const;

export const assetTypeEnum = z.enum(assetTypeValues);
export const assetCategoryEnum = z.enum(assetCategoryValues);
export const modelCompatibilityEnum = z.enum(modelCompatibilityValues);

// Asset content schema - flexible structure for different asset types
export const assetContentSchema = z.object({
  // For prompts
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  // For chains/agents
  steps: z
    .array(
      z.object({
        name: z.string(),
        prompt: z.string(),
        model: z.string().optional(),
      })
    )
    .optional(),
  // For skills
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional(),
  // Generic content field for simple prompts
  text: z.string().optional(),
  // Additional metadata
  variables: z.array(z.string()).optional(),
  outputFormat: z.string().optional(),
});

// Create asset schema
export const createAssetSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only"
    ),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be 2000 characters or less"),
  content: assetContentSchema,
  type: assetTypeEnum,
  category: assetCategoryEnum,
  modelCompatibility: z
    .array(modelCompatibilityEnum)
    .min(1, "At least one model compatibility is required"),
  sampleInput: z.string().max(5000).optional(),
  sampleOutput: z.string().max(5000).optional(),
  isFree: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(10).default([]),
  version: z.string().default("1.0.0"),
});

// Update asset schema - all fields optional
export const updateAssetSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200, "Title must be 200 characters or less")
    .optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only"
    )
    .optional(),
  description: z
    .string()
    .min(1)
    .max(2000, "Description must be 2000 characters or less")
    .optional(),
  content: assetContentSchema.optional(),
  type: assetTypeEnum.optional(),
  category: assetCategoryEnum.optional(),
  modelCompatibility: z.array(modelCompatibilityEnum).min(1).optional(),
  sampleInput: z.string().max(5000).optional().nullable(),
  sampleOutput: z.string().max(5000).optional().nullable(),
  isFree: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  version: z.string().optional(),
});

// Asset filter schema for query params
export const assetFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(["newest", "oldest", "popular", "downloads"]).default("newest"),
  type: assetTypeEnum.optional(),
  category: assetCategoryEnum.optional(),
  isFree: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  search: z.string().max(200).optional(),
  models: z
    .string()
    .transform((val) => val.split(",").filter(Boolean))
    .optional(),
});

// Asset search schema
export const assetSearchSchema = z.object({
  query: z
    .string()
    .min(2, "Search query must be at least 2 characters")
    .max(200),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: assetTypeEnum.optional(),
  category: assetCategoryEnum.optional(),
  isFree: z.boolean().optional(),
});

// Download format schema
export const downloadFormatSchema = z.enum(["json", "yaml", "txt"]);

// Asset download request schema
export const assetDownloadSchema = z.object({
  format: downloadFormatSchema.default("json"),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetFilterInput = z.infer<typeof assetFilterSchema>;
export type AssetSearchInput = z.infer<typeof assetSearchSchema>;
export type AssetDownloadInput = z.infer<typeof assetDownloadSchema>;
export type AssetContent = z.infer<typeof assetContentSchema>;

// Helper to generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
}

// Helper to validate asset content size (500KB for prompts, 5MB for agents)
export function validateAssetContentSize(
  content: unknown,
  type: (typeof assetTypeValues)[number]
): boolean {
  const contentStr = JSON.stringify(content);
  const sizeInBytes = new TextEncoder().encode(contentStr).length;

  const maxSize = type === "agent" ? 5 * 1024 * 1024 : 500 * 1024;
  return sizeInBytes <= maxSize;
}

// Re-export zod for convenience
export { z };
