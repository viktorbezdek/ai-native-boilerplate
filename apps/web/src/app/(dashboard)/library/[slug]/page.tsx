import {
  getPublishedAssetBySlug,
  incrementViewCount,
  trackAssetAccess,
  trackUserView,
} from "@repo/database/queries";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";
import { AssetContent } from "./_components/asset-content";
import { AssetHeader } from "./_components/asset-header";
import { SubscriptionGate } from "./_components/subscription-gate";

interface AssetDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: AssetDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const asset = await getPublishedAssetBySlug(slug);

  if (!asset) {
    return { title: "Asset Not Found" };
  }

  return {
    title: `${asset.title} | AI-Native Library`,
    description: asset.description,
    openGraph: {
      title: asset.title,
      description: asset.description,
      type: "article",
    },
  };
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const { slug } = await params;
  const asset = await getPublishedAssetBySlug(slug);

  if (!asset) {
    notFound();
  }

  const userId = session.user.id;

  // Track view asynchronously (fire and forget)
  Promise.all([
    incrementViewCount(asset.id),
    trackUserView(userId, asset.id),
    trackAssetAccess({
      assetId: asset.id,
      userId,
      accessType: "view",
    }),
  ]).catch(console.error);

  // Check if user has access
  const isSubscriber = await hasActiveSubscription(userId);
  const hasAccess = asset.isFree || isSubscriber;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/library" className="hover:underline">
          Library
        </Link>
        <span>/</span>
        <span className="capitalize">{asset.type}s</span>
        <span>/</span>
        <span className="truncate max-w-[200px]">{asset.title}</span>
      </nav>

      {/* Header Section */}
      <AssetHeader asset={asset} hasAccess={hasAccess} />

      {/* Content Section */}
      {hasAccess ? (
        <AssetContent asset={asset} />
      ) : (
        <SubscriptionGate asset={asset} />
      )}

      {/* Sample Section - always visible */}
      {(asset.sampleInput || asset.sampleOutput) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Example Usage</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {asset.sampleInput && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Sample Input
                </h3>
                <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md overflow-x-auto">
                  {asset.sampleInput}
                </pre>
              </div>
            )}
            {asset.sampleOutput && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Sample Output
                </h3>
                <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md overflow-x-auto">
                  {asset.sampleOutput}
                </pre>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
