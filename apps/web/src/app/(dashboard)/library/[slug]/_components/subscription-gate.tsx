import type { Asset } from "@repo/database/schema";
import Link from "next/link";

interface SubscriptionGateProps {
  asset: Asset;
}

export function SubscriptionGate({ asset }: SubscriptionGateProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Content</h2>

      <div className="rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10 p-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          {/* Lock Icon */}
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="Lock icon"
            >
              <title>Locked content</title>
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold">Subscription Required</h3>

          <p className="text-muted-foreground">
            This is a premium asset. Subscribe to get access to this and{" "}
            <strong>all other Pro assets</strong> in the library.
          </p>

          {/* Preview of what they'll get */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 text-left">
            <p className="font-medium mb-2">With a subscription you can:</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-600">&#10003;</span>
                View full asset content
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">&#10003;</span>
                Download in JSON, YAML, or Text format
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">&#10003;</span>
                Access all Pro assets in the catalog
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">&#10003;</span>
                Get early access to new releases
              </li>
            </ul>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View Subscription Plans
          </Link>

          <p className="text-xs text-muted-foreground">
            Already subscribed?{" "}
            <Link href="/settings" className="underline hover:text-foreground">
              Check your account status
            </Link>
          </p>
        </div>
      </div>

      {/* Blurred preview */}
      <div className="relative rounded-lg border bg-card overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10" />
        <div className="border-b px-4 py-2 bg-muted/50">
          <span className="text-sm font-medium">Asset Content (Preview)</span>
        </div>
        <pre className="p-4 overflow-hidden text-sm max-h-48 opacity-30">
          <code>
            {JSON.stringify(
              {
                type: asset.type,
                category: asset.category,
                content: "[ Subscribe to view full content ]",
                modelCompatibility: asset.modelCompatibility,
              },
              null,
              2
            )}
          </code>
        </pre>
      </div>
    </section>
  );
}
