"use client";

import type { Asset } from "@repo/database/schema";
import { cn } from "@repo/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface AssetGridProps {
  assets: Asset[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  currentPage: number;
}

const typeColors: Record<string, string> = {
  prompt: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  chain:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  skill: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  agent:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export function AssetGrid({ assets, meta, currentPage }: AssetGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());

    startTransition(() => {
      router.push(`/library?${params.toString()}`);
    });
  };

  const totalPages = Math.ceil(meta.total / meta.limit);

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
        <div className="text-4xl mb-4">No results found</div>
        <p className="text-muted-foreground mb-4">
          Try adjusting your filters or search query
        </p>
        <Link
          href="/library"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Clear Filters
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {(currentPage - 1) * meta.limit + 1}-
          {Math.min(currentPage * meta.limit, meta.total)} of {meta.total}{" "}
          assets
        </span>
      </div>

      {/* Grid */}
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          isPending && "opacity-50"
        )}
      >
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => goToPage(pageNum)}
                  disabled={isPending}
                  className={cn(
                    "h-8 w-8 rounded-md text-sm",
                    pageNum === currentPage
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

interface AssetCardProps {
  asset: Asset;
}

function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link
      href={`/library/${asset.slug}`}
      className="group flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            typeColors[asset.type]
          )}
        >
          {asset.type}
        </span>
        {asset.isFree ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Free
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Pro
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {asset.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
        {asset.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{asset.category}</span>
        <div className="flex items-center gap-3">
          <span>{asset.viewCount.toLocaleString()} views</span>
          <span>{asset.downloadCount.toLocaleString()} downloads</span>
        </div>
      </div>

      {/* Tags */}
      {asset.tags && asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
          {asset.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{asset.tags.length - 3} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
