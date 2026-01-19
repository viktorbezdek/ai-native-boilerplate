export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          AI-Native Boilerplate
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Production-ready template for autonomous AI-driven development.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/dashboard"
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            Get started
          </a>
          <a
            href="https://github.com"
            className="text-sm font-semibold leading-6"
          >
            View on GitHub <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
