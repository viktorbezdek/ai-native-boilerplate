import type { Asset } from "@repo/database/schema";
import { cn } from "@repo/utils";

interface AssetHeaderProps {
  asset: Asset;
  hasAccess: boolean;
}

const typeColors: Record<string, string> = {
  prompt: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  chain:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  skill: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  agent:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
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

const modelLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "open-source": "Open Source",
  universal: "Universal",
};

export function AssetHeader({ asset, hasAccess }: AssetHeaderProps) {
  return (
    <header className="space-y-4">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium capitalize",
            typeColors[asset.type]
          )}
        >
          {asset.type}
        </span>
        <span className="rounded-full border px-3 py-1 text-sm">
          {categoryLabels[asset.category]}
        </span>
        {asset.isFree ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Free
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Pro
          </span>
        )}
        {hasAccess && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Access Granted
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight">{asset.title}</h1>

      {/* Description */}
      <p className="text-lg text-muted-foreground">{asset.description}</p>

      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
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

      {/* Model Compatibility */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Works with:</span>
        {asset.modelCompatibility.map((model) => (
          <span
            key={model}
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
          >
            {modelLabels[model] ?? model}
          </span>
        ))}
      </div>

      {/* Tags */}
      {asset.tags && asset.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {asset.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
