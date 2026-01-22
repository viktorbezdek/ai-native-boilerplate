"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              We've been notified and are working on a fix.
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Try again
              </button>
              <a
                href="/"
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Go home
              </a>
            </div>
            {error.digest && (
              <p className="mt-8 text-sm text-gray-400">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
