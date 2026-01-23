import { getAssetStats, getAssets } from "@repo/database/queries";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { AssetFilters } from "./_components/asset-filters";
import { AssetGrid } from "./_components/asset-grid";
import { SearchBar } from "./_components/search-bar";

export const metadata: Metadata = {
  title: "Asset Library | AI-Native",
  description: "Browse AI prompts, chains, skills, and agents",
};

interface LibraryPageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    category?: string;
    isFree?: string;
    sort?: string;
    search?: string;
    models?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10));
  const type = params.type as
    | "prompt"
    | "chain"
    | "skill"
    | "agent"
    | undefined;
  const category = params.category as
    | "productivity"
    | "writing"
    | "coding"
    | "analysis"
    | "creative"
    | "business"
    | "education"
    | "other"
    | undefined;
  const isFree = params.isFree === "true" ? true : undefined;
  const sort = (params.sort ?? "newest") as
    | "newest"
    | "oldest"
    | "popular"
    | "downloads";
  const search = params.search;
  const models = params.models?.split(",").filter(Boolean);

  // Fetch assets and stats in parallel
  const [assetsResult, stats] = await Promise.all([
    getAssets({
      page,
      limit: 12,
      sort,
      type,
      category,
      isFree,
      isPublished: true,
      search,
      models,
    }),
    getAssetStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Library</h1>
        <p className="text-muted-foreground">
          Browse {stats.published.toLocaleString()} AI prompts, chains, skills,
          and agents
        </p>
      </div>

      {/* Search */}
      <SearchBar initialSearch={search} />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <Suspense
            fallback={
              <div className="h-96 animate-pulse bg-muted rounded-lg" />
            }
          >
            <AssetFilters
              stats={stats}
              currentFilters={{
                type,
                category,
                isFree,
                sort,
                models,
              }}
            />
          </Suspense>
        </aside>

        {/* Asset Grid */}
        <main className="flex-1">
          <Suspense
            fallback={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => (
                  <div
                    key={id}
                    className="h-64 animate-pulse bg-muted rounded-lg"
                  />
                ))}
              </div>
            }
          >
            <AssetGrid
              assets={assetsResult.data}
              meta={assetsResult.meta}
              currentPage={page}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
