"use client";

import type { Asset } from "@repo/database/schema";
import { cn } from "@repo/utils";
import { useState } from "react";

interface AssetContentProps {
  asset: Asset;
}

type DownloadFormat = "json" | "yaml" | "txt";

export function AssetContent({ asset }: AssetContentProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const contentString = JSON.stringify(asset.content, null, 2);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(contentString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const download = async (format: DownloadFormat) => {
    setDownloading(true);
    try {
      const response = await fetch(
        `/api/v1/assets/${asset.id}/download?format=${format}`
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `${asset.slug}.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Content</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              copied
                ? "bg-green-100 text-green-800 border-green-300"
                : "hover:bg-muted"
            )}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  download(e.target.value as DownloadFormat);
                  e.target.value = "";
                }
              }}
              disabled={downloading}
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              defaultValue=""
            >
              <option value="" disabled>
                {downloading ? "Downloading..." : "Download"}
              </option>
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="txt">Text</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Display */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-2 bg-muted/50">
          <span className="text-sm font-medium">Asset Content</span>
        </div>
        <pre className="p-4 overflow-x-auto text-sm">
          <code>{contentString}</code>
        </pre>
      </div>

      {/* Content Analysis */}
      <ContentAnalysis content={asset.content} />
    </section>
  );
}

interface ContentAnalysisProps {
  content: unknown;
}

function ContentAnalysis({ content }: ContentAnalysisProps) {
  if (!content || typeof content !== "object") {
    return null;
  }

  const c = content as Record<string, unknown>;

  const hasText = typeof c.text === "string" && c.text.length > 0;
  const hasSystemPrompt =
    typeof c.systemPrompt === "string" && c.systemPrompt.length > 0;
  const hasUserPrompt =
    typeof c.userPrompt === "string" && c.userPrompt.length > 0;
  const steps = Array.isArray(c.steps) ? c.steps : [];
  const tools = Array.isArray(c.tools) ? c.tools : [];
  const variables = Array.isArray(c.variables) ? (c.variables as string[]) : [];
  const hasOutputFormat =
    typeof c.outputFormat === "string" && c.outputFormat.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="font-medium">Content Structure</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Prompt content */}
        {hasText && (
          <div className="rounded-md bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground">
              Prompt Text
            </span>
            <p className="text-sm mt-1 line-clamp-3">{String(c.text)}</p>
          </div>
        )}

        {hasSystemPrompt && (
          <div className="rounded-md bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground">
              System Prompt
            </span>
            <p className="text-sm mt-1 line-clamp-3">
              {String(c.systemPrompt)}
            </p>
          </div>
        )}

        {hasUserPrompt && (
          <div className="rounded-md bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground">
              User Prompt
            </span>
            <p className="text-sm mt-1 line-clamp-3">{String(c.userPrompt)}</p>
          </div>
        )}

        {/* Chain steps */}
        {steps.length > 0 && (
          <div className="rounded-md bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground">
              Chain Steps
            </span>
            <p className="text-sm mt-1">{steps.length} steps defined</p>
            <ul className="text-xs text-muted-foreground mt-1">
              {steps.slice(0, 3).map((step, i) => {
                const s = step as { name?: string };
                const name = s?.name ?? `Step ${i + 1}`;
                return <li key={name}>{name}</li>;
              })}
              {steps.length > 3 && <li>...and {steps.length - 3} more</li>}
            </ul>
          </div>
        )}

        {/* Skill tools */}
        {tools.length > 0 && (
          <div className="rounded-md bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground">
              Tools
            </span>
            <p className="text-sm mt-1">{tools.length} tools defined</p>
            <ul className="text-xs text-muted-foreground mt-1">
              {tools.slice(0, 3).map((tool, i) => {
                const t = tool as { name?: string };
                const name = t?.name ?? `Tool ${i + 1}`;
                return <li key={name}>{name}</li>;
              })}
              {tools.length > 3 && <li>...and {tools.length - 3} more</li>}
            </ul>
          </div>
        )}

        {/* Variables */}
        {variables.length > 0 && (
          <div className="rounded-md bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground">
              Variables
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {variables.map((v) => (
                <code
                  key={v}
                  className="rounded bg-background px-1 py-0.5 text-xs"
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Output format */}
        {hasOutputFormat && (
          <div className="rounded-md bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground">
              Output Format
            </span>
            <p className="text-sm mt-1">{String(c.outputFormat)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
