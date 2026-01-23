"use client";

import type { Asset } from "@repo/database/schema";
import { cn } from "@repo/utils";
import {
  type AssetContent,
  assetCategoryValues,
  assetTypeValues,
  generateSlug,
  modelCompatibilityValues,
} from "@repo/validations";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createAssetAction, updateAssetAction } from "@/lib/actions/assets";

interface AssetFormProps {
  asset?: Asset;
  mode: "create" | "edit";
}

const typeDescriptions: Record<string, string> = {
  prompt: "A single prompt template for AI models",
  chain: "A sequence of prompts that work together",
  skill: "A reusable capability with tool definitions",
  agent: "A complete agent with prompts, tools, and logic",
};

const categoryIcons: Record<string, string> = {
  productivity: "⚡",
  writing: "✍️",
  coding: "💻",
  analysis: "📊",
  creative: "🎨",
  business: "💼",
  education: "📚",
  other: "📦",
};

export function AssetForm({ asset, mode }: AssetFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState(asset?.title ?? "");
  const [slug, setSlug] = useState(asset?.slug ?? "");
  const [description, setDescription] = useState(asset?.description ?? "");
  const [type, setType] = useState<string>(asset?.type ?? "prompt");
  const [category, setCategory] = useState<string>(asset?.category ?? "other");
  const [modelCompatibility, setModelCompatibility] = useState<string[]>(
    asset?.modelCompatibility ?? ["universal"]
  );
  const [content, setContent] = useState(
    asset?.content
      ? JSON.stringify(asset.content, null, 2)
      : '{\n  "text": ""\n}'
  );
  const [sampleInput, setSampleInput] = useState(asset?.sampleInput ?? "");
  const [sampleOutput, setSampleOutput] = useState(asset?.sampleOutput ?? "");
  const [tags, setTags] = useState((asset?.tags ?? []).join(", "));
  const [isFree, setIsFree] = useState(asset?.isFree ?? false);
  const [isPublished, setIsPublished] = useState(asset?.isPublished ?? false);
  const [version, setVersion] = useState(asset?.version ?? "1.0.0");

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (mode === "create" && !slug) {
      setSlug(generateSlug(value));
    }
  };

  // Toggle model compatibility
  const toggleModel = (model: string) => {
    setModelCompatibility((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parse content JSON
    let parsedContent: AssetContent;
    try {
      parsedContent = JSON.parse(content) as AssetContent;
    } catch {
      setError("Invalid JSON in content field");
      return;
    }

    // Parse tags
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const formData = {
      title,
      slug,
      description,
      type: type as "prompt" | "chain" | "skill" | "agent",
      category: category as
        | "productivity"
        | "writing"
        | "coding"
        | "analysis"
        | "creative"
        | "business"
        | "education"
        | "other",
      modelCompatibility: modelCompatibility as (
        | "openai"
        | "anthropic"
        | "google"
        | "open-source"
        | "universal"
      )[],
      content: parsedContent,
      sampleInput: sampleInput || undefined,
      sampleOutput: sampleOutput || undefined,
      tags: parsedTags,
      isFree,
      isPublished,
      version,
    };

    startTransition(async () => {
      let result: { success: boolean; error?: string } | undefined;

      if (mode === "create") {
        result = await createAssetAction(formData);
      } else if (asset) {
        result = await updateAssetAction(asset.id, formData);
      }

      if (result?.success) {
        router.push("/admin/assets");
        router.refresh();
      } else {
        setError(result?.error ?? "An error occurred");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Basic Information</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g., Email Writer Pro"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">
              URL Slug *
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              maxLength={200}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g., email-writer-pro"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={2000}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Describe what this asset does and why it's useful..."
          />
        </div>
      </div>

      {/* Classification */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Classification</h2>

        <div className="space-y-2">
          <span className="text-sm font-medium">Type *</span>
          <div className="grid gap-3 md:grid-cols-4">
            {assetTypeValues.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  type === t ? "border-primary bg-primary/5" : "hover:bg-muted"
                )}
              >
                <div className="font-medium capitalize">{t}</div>
                <div className="text-xs text-muted-foreground">
                  {typeDescriptions[t]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Category *</span>
          <div className="flex flex-wrap gap-2">
            {assetCategoryValues.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  category === c
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
              >
                <span className="mr-1">{categoryIcons[c]}</span>
                <span className="capitalize">{c}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Model Compatibility *</span>
          <div className="flex flex-wrap gap-2">
            {modelCompatibilityValues.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleModel(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  modelCompatibility.includes(m)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {m === "open-source"
                  ? "Open Source"
                  : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          {modelCompatibility.length === 0 && (
            <p className="text-xs text-destructive">
              Select at least one model compatibility
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Content</h2>

        <div className="space-y-2">
          <label htmlFor="content" className="text-sm font-medium">
            Asset Content (JSON) *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={12}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            placeholder='{"text": "Your prompt here..."}'
          />
          <p className="text-xs text-muted-foreground">
            For prompts, use {"{"}&quot;text&quot;: &quot;...&quot;{"}"} or{" "}
            {"{"}&quot;systemPrompt&quot;: &quot;...&quot;,
            &quot;userPrompt&quot;: &quot;...&quot;{"}"}
          </p>
        </div>
      </div>

      {/* Examples */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Examples</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="sampleInput" className="text-sm font-medium">
              Sample Input
            </label>
            <textarea
              id="sampleInput"
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              rows={4}
              maxLength={5000}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Example input to demonstrate usage..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sampleOutput" className="text-sm font-medium">
              Sample Output
            </label>
            <textarea
              id="sampleOutput"
              value={sampleOutput}
              onChange={(e) => setSampleOutput(e.target.value)}
              rows={4}
              maxLength={5000}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Expected output from the example..."
            />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Metadata</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="email, marketing, professional (comma-separated)"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="version" className="text-sm font-medium">
              Version
            </label>
            <input
              id="version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="1.0.0"
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Settings</h2>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">
              <span className="font-medium">Free Access</span>
              <span className="text-muted-foreground ml-1">
                (Available to all users)
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">
              <span className="font-medium">Published</span>
              <span className="text-muted-foreground ml-1">
                (Visible in catalog)
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 border-t pt-6">
        <button
          type="submit"
          disabled={isPending || modelCompatibility.length === 0}
          className={cn(
            "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
            isPending && "opacity-50 cursor-wait"
          )}
        >
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create Asset"
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
