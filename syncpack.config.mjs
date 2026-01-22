// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
  dependencyTypes: ["dev", "peer", "prod"],
  semverGroups: [
    {
      range: "^",
      dependencyTypes: ["dev", "peer", "prod"],
      dependencies: ["**"],
      packages: ["**"],
    },
  ],
  versionGroups: [
    {
      label: "Use workspace protocol for internal packages",
      dependencies: ["@repo/**"],
      dependencyTypes: ["dev", "peer", "prod"],
      pinVersion: "workspace:*",
    },
    {
      label: "Ensure React versions are aligned",
      dependencies: ["react", "react-dom", "@types/react", "@types/react-dom"],
      packages: ["**"],
    },
    {
      label: "Ensure Vitest versions are aligned",
      dependencies: ["vitest", "@vitest/**"],
      packages: ["**"],
    },
    {
      label: "Ensure TypeScript versions are aligned",
      dependencies: ["typescript"],
      packages: ["**"],
    },
  ],
  source: ["package.json", "apps/*/package.json", "packages/*/package.json"],
};

export default config;
