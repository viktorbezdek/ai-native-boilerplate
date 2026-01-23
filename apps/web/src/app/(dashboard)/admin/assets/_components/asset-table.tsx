"use client";

import type { Asset } from "@repo/database/schema";
import { cn } from "@repo/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteAssetAction,
  duplicateAssetAction,
  publishAssetAction,
  toggleAssetAccessAction,
  unpublishAssetAction,
} from "@/lib/actions/assets";

interface AssetTableProps {
  assets: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const typeIcons: Record<string, string> = {
  prompt: "💬",
  chain: "🔗",
  skill: "🛠️",
  agent: "🤖",
};

const categoryColors: Record<string, string> = {
  productivity: "bg-blue-100 text-blue-800",
  writing: "bg-purple-100 text-purple-800",
  coding: "bg-green-100 text-green-800",
  analysis: "bg-yellow-100 text-yellow-800",
  creative: "bg-pink-100 text-pink-800",
  business: "bg-orange-100 text-orange-800",
  education: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

export function AssetTable({ assets, pagination }: AssetTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionAssetId, setActionAssetId] = useState<string | null>(null);

  const handlePublish = async (assetId: string, isPublished: boolean) => {
    setActionAssetId(assetId);
    startTransition(async () => {
      if (isPublished) {
        await unpublishAssetAction(assetId);
      } else {
        await publishAssetAction(assetId);
      }
      router.refresh();
      setActionAssetId(null);
    });
  };

  const handleToggleAccess = async (assetId: string) => {
    setActionAssetId(assetId);
    startTransition(async () => {
      await toggleAssetAccessAction(assetId);
      router.refresh();
      setActionAssetId(null);
    });
  };

  const handleDuplicate = async (assetId: string) => {
    setActionAssetId(assetId);
    startTransition(async () => {
      const result = await duplicateAssetAction(assetId);
      if (result.success && result.data) {
        router.push(`/admin/assets/${result.data.id}`);
      }
      setActionAssetId(null);
    });
  };

  const handleDelete = async (assetId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    setActionAssetId(assetId);
    startTransition(async () => {
      await deleteAssetAction(assetId);
      router.refresh();
      setActionAssetId(null);
    });
  };

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-4" role="img" aria-label="Empty box">
          📭
        </span>
        <h3 className="text-lg font-medium">No assets yet</h3>
        <p className="text-muted-foreground mt-1">
          Get started by creating your first asset.
        </p>
        <Link
          href="/admin/assets/new"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Create Asset
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Asset</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Access</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Stats</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.id}
                className="border-b last:border-0 hover:bg-muted/50"
              >
                <td className="py-4">
                  <Link
                    href={`/admin/assets/${asset.id}`}
                    className="block hover:underline"
                  >
                    <div className="font-medium">{asset.title}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {asset.description}
                    </div>
                  </Link>
                </td>
                <td className="py-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span role="img" aria-label={`${asset.type} icon`}>
                      {typeIcons[asset.type]}
                    </span>
                    <span className="capitalize">{asset.type}</span>
                  </span>
                </td>
                <td className="py-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      categoryColors[asset.category] || categoryColors.other
                    )}
                  >
                    {asset.category}
                  </span>
                </td>
                <td className="py-4">
                  <button
                    type="button"
                    onClick={() => handleToggleAccess(asset.id)}
                    disabled={isPending && actionAssetId === asset.id}
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                      asset.isFree
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-200",
                      isPending &&
                        actionAssetId === asset.id &&
                        "opacity-50 cursor-wait"
                    )}
                  >
                    {asset.isFree ? "Free" : "Subscriber"}
                  </button>
                </td>
                <td className="py-4">
                  <button
                    type="button"
                    onClick={() => handlePublish(asset.id, asset.isPublished)}
                    disabled={isPending && actionAssetId === asset.id}
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                      asset.isPublished
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200",
                      isPending &&
                        actionAssetId === asset.id &&
                        "opacity-50 cursor-wait"
                    )}
                  >
                    {asset.isPublished ? "Published" : "Draft"}
                  </button>
                </td>
                <td className="py-4 text-right">
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {asset.viewCount.toLocaleString()} views
                    </span>
                    <span className="mx-1">·</span>
                    <span className="text-muted-foreground">
                      {asset.downloadCount.toLocaleString()} downloads
                    </span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/assets/${asset.id}`}
                      className="rounded-md px-2 py-1 text-sm hover:bg-muted"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(asset.id)}
                      disabled={isPending && actionAssetId === asset.id}
                      className="rounded-md px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(asset.id, asset.title)}
                      disabled={isPending && actionAssetId === asset.id}
                      className="rounded-md px-2 py-1 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} assets
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/assets?page=${pagination.page - 1}`}
              className={cn(
                "rounded-md border px-3 py-1 text-sm",
                pagination.page <= 1
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-muted"
              )}
            >
              Previous
            </Link>
            <Link
              href={`/admin/assets?page=${pagination.page + 1}`}
              className={cn(
                "rounded-md border px-3 py-1 text-sm",
                !pagination.hasMore
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-muted"
              )}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
