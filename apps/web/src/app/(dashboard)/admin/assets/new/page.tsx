import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AssetForm } from "../_components/asset-form";

export const metadata: Metadata = {
  title: "New Asset | Admin",
};

export default async function NewAssetPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Check admin role
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/admin/assets" className="hover:underline">
            Assets
          </Link>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Asset</h1>
        <p className="text-muted-foreground">
          Add a new AI prompt, chain, skill, or agent to your catalog.
        </p>
      </div>

      <div className="max-w-3xl">
        <AssetForm mode="create" />
      </div>
    </div>
  );
}
