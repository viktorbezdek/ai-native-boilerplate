"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface SearchBarProps {
  initialSearch?: string;
}

export function SearchBar({ initialSearch }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch ?? "");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const params = new URLSearchParams(searchParams.toString());

      if (search.trim()) {
        params.set("search", search.trim());
      } else {
        params.delete("search");
      }

      // Reset to page 1 on new search
      params.delete("page");

      startTransition(() => {
        router.push(`/library?${params.toString()}`);
      });
    },
    [search, searchParams, router]
  );

  const clearSearch = useCallback(() => {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");

    startTransition(() => {
      router.push(`/library?${params.toString()}`);
    });
  }, [searchParams, router]);

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts, chains, skills, agents..."
          className="w-full rounded-md border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isPending}
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <span aria-hidden="true">x</span>
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "..." : "Search"}
      </button>
    </form>
  );
}
