import { getAssetStats, getAssets } from "@repo/database/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AssetTable } from "./_components/asset-table";

export const metadata: Metadata = {
  title: "Manage Assets | Admin",
};

interface AdminAssetsPageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    category?: string;
    status?: string;
  }>;
}

export default async function AdminAssetsPage({
  searchParams,
}: AdminAssetsPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Check admin role
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Number(params.page) || 1;

  // Fetch assets and stats in parallel
  const [assetsResult, stats] = await Promise.all([
    getAssets({
      page,
      limit: 20,
      isPublished: undefined, // Show all assets for admin
      type: params.type as "prompt" | "chain" | "skill" | "agent" | undefined,
      category: params.category as
        | "productivity"
        | "writing"
        | "coding"
        | "analysis"
        | "creative"
        | "business"
        | "education"
        | "other"
        | undefined,
    }),
    getAssetStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Manage your AI prompts, chains, skills, and agents.
          </p>
        </div>
        <Link
          href="/admin/assets/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          + New Asset
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <span className="text-2xl" role="img" aria-label="Package icon">
              📦
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.published} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Assets</CardTitle>
            <span className="text-2xl" role="img" aria-label="Gift icon">
              🎁
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.free}</div>
            <p className="text-xs text-muted-foreground">
              {stats.published > 0
                ? Math.round((stats.free / stats.published) * 100)
                : 0}
              % of published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
            <span className="text-2xl" role="img" aria-label="Categories icon">
              🏷️
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize text-muted-foreground">
                    {type}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(stats.byType).length === 0 && (
                <span className="text-muted-foreground">No assets yet</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Category</CardTitle>
            <span className="text-2xl" role="img" aria-label="Folder icon">
              📂
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {Object.entries(stats.byCategory)
                .slice(0, 4)
                .map(([category, count]) => (
                  <div key={category} className="flex justify-between">
                    <span className="capitalize text-muted-foreground">
                      {category}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              {Object.keys(stats.byCategory).length === 0 && (
                <span className="text-muted-foreground">No assets yet</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assets</CardTitle>
          <CardDescription>
            A list of all assets in your catalog. Click on an asset to edit it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetTable
            assets={assetsResult.data}
            pagination={assetsResult.meta}
          />
        </CardContent>
      </Card>
    </div>
  );
}
