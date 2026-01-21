export default function HomePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center p-8"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          AI-Native Boilerplate
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Production-ready template for building AI-native products with Claude
          Code. Full test coverage, automated workflows, and best practices
          baked in.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/dashboard"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Get started
          </a>
          <a
            href="https://github.com/your-org/ai-native-boilerplate"
            className="text-sm font-semibold leading-6"
          >
            View on GitHub <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
