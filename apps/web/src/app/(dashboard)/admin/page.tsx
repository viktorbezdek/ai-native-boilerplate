import { getAdminDashboardMetrics } from "@repo/database/queries";
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

export const metadata: Metadata = {
  title: "Admin Dashboard | AI-Native",
};

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Check admin role
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your asset library performance
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <span className="text-2xl" role="img" aria-label="Package icon">
              📦
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.publishedAssets} published, {metrics.draftAssets} drafts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <span className="text-2xl" role="img" aria-label="Eye icon">
              👁️
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all published assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <span className="text-2xl" role="img" aria-label="Download icon">
              📥
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalDownloads.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total asset downloads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Split</CardTitle>
            <span className="text-2xl" role="img" aria-label="Lock icon">
              🔐
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.freeAssets}/{metrics.paidAssets}
            </div>
            <p className="text-xs text-muted-foreground">Free / Pro assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Type & Category */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Type</CardTitle>
            <CardDescription>
              Asset counts and engagement by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.byType).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="capitalize font-medium">{type}</span>
                    <span className="text-xs text-muted-foreground">
                      ({stats.count} assets)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {stats.views.toLocaleString()} views
                    </span>
                    <span className="text-muted-foreground">
                      {stats.downloads.toLocaleString()} downloads
                    </span>
                  </div>
                </div>
              ))}
              {Object.keys(metrics.byType).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assets yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
            <CardDescription>
              Asset counts and engagement by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {Object.entries(metrics.byCategory)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([category, stats]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="capitalize font-medium">{category}</span>
                      <span className="text-xs text-muted-foreground">
                        ({stats.count})
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {stats.views.toLocaleString()} views
                      </span>
                      <span className="text-muted-foreground">
                        {stats.downloads.toLocaleString()} downloads
                      </span>
                    </div>
                  </div>
                ))}
              {Object.keys(metrics.byCategory).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assets yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers & Recent Assets */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Assets</CardTitle>
            <CardDescription>Highest engagement assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topPerformers.map((asset, index) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div>
                      <Link
                        href={`/admin/assets/${asset.id}`}
                        className="font-medium hover:underline"
                      >
                        {asset.title}
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">
                        {asset.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{asset.viewCount.toLocaleString()} views</div>
                    <div className="text-muted-foreground">
                      {asset.downloadCount.toLocaleString()} downloads
                    </div>
                  </div>
                </div>
              ))}
              {metrics.topPerformers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No published assets yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
            <CardDescription>Latest assets in the catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        asset.isPublished ? "bg-green-500" : "bg-amber-500"
                      }`}
                      title={asset.isPublished ? "Published" : "Draft"}
                    />
                    <div>
                      <Link
                        href={`/admin/assets/${asset.id}`}
                        className="font-medium hover:underline"
                      >
                        {asset.title}
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">
                        {asset.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {metrics.recentAssets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assets yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/assets/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create New Asset
            </Link>
            <Link
              href="/admin/assets"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Manage Assets
            </Link>
            <Link
              href="/admin/subscribers"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              View Subscribers
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
