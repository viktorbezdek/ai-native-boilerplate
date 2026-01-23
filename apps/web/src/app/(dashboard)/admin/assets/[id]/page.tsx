import { getAssetById } from "@repo/database/queries";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AssetForm } from "../_components/asset-form";

export const metadata: Metadata = {
  title: "Edit Asset | Admin",
};

interface EditAssetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAssetPage({ params }: EditAssetPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Check admin role
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const asset = await getAssetById(id);

  if (!asset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/admin/assets" className="hover:underline">
            Assets
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px]">{asset.title}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Asset</h1>
        <p className="text-muted-foreground">
          Update the details of your asset.
        </p>
      </div>

      {/* Asset Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">
            {asset.viewCount.toLocaleString()}
          </span>{" "}
          views
        </span>
        <span>
          <span className="font-medium text-foreground">
            {asset.downloadCount.toLocaleString()}
          </span>{" "}
          downloads
        </span>
        <span>
          Version{" "}
          <span className="font-medium text-foreground">{asset.version}</span>
        </span>
        {asset.publishedAt && (
          <span>
            Published{" "}
            <span className="font-medium text-foreground">
              {new Date(asset.publishedAt).toLocaleDateString()}
            </span>
          </span>
        )}
      </div>

      <div className="max-w-3xl">
        <AssetForm asset={asset} mode="edit" />
      </div>
    </div>
  );
}
