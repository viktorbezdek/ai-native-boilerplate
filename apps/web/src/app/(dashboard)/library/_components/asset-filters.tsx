"use client";

import { cn } from "@repo/utils";
import {
  assetCategoryValues,
  assetTypeValues,
  modelCompatibilityValues,
} from "@repo/validations";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface AssetFiltersProps {
  stats: {
    total: number;
    published: number;
    free: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
  currentFilters: {
    type?: string;
    category?: string;
    isFree?: boolean;
    sort?: string;
    models?: string[];
  };
}

const typeLabels: Record<string, string> = {
  prompt: "Prompts",
  chain: "Chains",
  skill: "Skills",
  agent: "Agents",
};

const categoryLabels: Record<string, string> = {
  productivity: "Productivity",
  writing: "Writing",
  coding: "Coding",
  analysis: "Analysis",
  creative: "Creative",
  business: "Business",
  education: "Education",
  other: "Other",
};

// Icons reserved for future use in category display
// const categoryIcons: Record<string, string> = {
//   productivity: "lightning",
//   writing: "pen",
//   coding: "code",
//   analysis: "chart",
//   creative: "palette",
//   business: "briefcase",
//   education: "book",
//   other: "box",
// };

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "popular", label: "Most Viewed" },
  { value: "downloads", label: "Most Downloaded" },
];

const modelLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "open-source": "Open Source",
  universal: "Universal",
};

export function AssetFilters({ stats, currentFilters }: AssetFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      // Reset to page 1 on filter change
      params.delete("page");

      startTransition(() => {
        router.push(`/library?${params.toString()}`);
      });
    },
    [searchParams, router]
  );

  const toggleModel = useCallback(
    (model: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const currentModels =
        params.get("models")?.split(",").filter(Boolean) ?? [];

      let newModels: string[];
      if (currentModels.includes(model)) {
        newModels = currentModels.filter((m) => m !== model);
      } else {
        newModels = [...currentModels, model];
      }

      if (newModels.length > 0) {
        params.set("models", newModels.join(","));
      } else {
        params.delete("models");
      }

      params.delete("page");

      startTransition(() => {
        router.push(`/library?${params.toString()}`);
      });
    },
    [searchParams, router]
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push("/library");
    });
  }, [router]);

  const hasActiveFilters =
    currentFilters.type ||
    currentFilters.category ||
    currentFilters.isFree ||
    (currentFilters.models && currentFilters.models.length > 0);

  return (
    <div
      className={cn(
        "space-y-6 rounded-lg border bg-card p-4",
        isPending && "opacity-50"
      )}
    >
      {/* Sort */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Sort By</h3>
        <select
          value={currentFilters.sort ?? "newest"}
          onChange={(e) => updateFilter("sort", e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          disabled={isPending}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type Filter */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Type</h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateFilter("type", null)}
            disabled={isPending}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
              !currentFilters.type
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>All Types</span>
            <span className="text-xs opacity-70">{stats.published}</span>
          </button>
          {assetTypeValues.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateFilter("type", type)}
              disabled={isPending}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                currentFilters.type === type
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span>{typeLabels[type]}</span>
              <span className="text-xs opacity-70">
                {stats.byType[type] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Category</h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateFilter("category", null)}
            disabled={isPending}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
              !currentFilters.category
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>All Categories</span>
          </button>
          {assetCategoryValues.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => updateFilter("category", category)}
              disabled={isPending}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                currentFilters.category === category
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span>{categoryLabels[category]}</span>
              <span className="text-xs opacity-70">
                {stats.byCategory[category] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Access Filter */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Access</h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateFilter("isFree", null)}
            disabled={isPending}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
              currentFilters.isFree === undefined
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>All Assets</span>
          </button>
          <button
            type="button"
            onClick={() => updateFilter("isFree", "true")}
            disabled={isPending}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
              currentFilters.isFree === true
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>Free Only</span>
            <span className="text-xs opacity-70">{stats.free}</span>
          </button>
        </div>
      </div>

      {/* Model Compatibility */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Model Compatibility</h3>
        <div className="flex flex-wrap gap-1.5">
          {modelCompatibilityValues.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => toggleModel(model)}
              disabled={isPending}
              className={cn(
                "rounded-full border px-2 py-1 text-xs transition-colors",
                currentFilters.models?.includes(model)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {modelLabels[model]}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          disabled={isPending}
          className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
