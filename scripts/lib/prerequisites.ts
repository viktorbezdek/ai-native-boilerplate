/**
 * Prerequisites validation for setup scripts
 * Checks required tools and versions
 */

import { $ } from "bun";
import { colors, error, info, success, warning } from "./ui";

interface PrerequisiteCheck {
  name: string;
  command: string;
  versionPattern: RegExp;
  minVersion: string;
  installUrl: string;
  required: boolean;
}

const checks: PrerequisiteCheck[] = [
  {
    name: "Bun",
    command: "bun --version",
    versionPattern: /^(\d+\.\d+\.\d+)/,
    minVersion: "1.1.38",
    installUrl: "https://bun.sh",
    required: true,
  },
  {
    name: "Node.js",
    command: "node --version",
    versionPattern: /^v?(\d+\.\d+\.\d+)/,
    minVersion: "20.0.0",
    installUrl: "https://nodejs.org",
    required: true,
  },
  {
    name: "Docker",
    command: "docker --version",
    versionPattern: /Docker version (\d+\.\d+\.\d+)/,
    minVersion: "24.0.0",
    installUrl: "https://docker.com",
    required: false,
  },
  {
    name: "Stripe CLI",
    command: "stripe --version",
    versionPattern: /stripe version (\d+\.\d+\.\d+)/i,
    minVersion: "1.0.0",
    installUrl: "https://stripe.com/docs/stripe-cli",
    required: false,
  },
];

function compareVersions(current: string, minimum: string): number {
  const currentParts = current.split(".").map(Number);
  const minimumParts = minimum.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i++) {
    const curr = currentParts[i] || 0;
    const min = minimumParts[i] || 0;
    if (curr > min) return 1;
    if (curr < min) return -1;
  }
  return 0;
}

interface CheckResultInternal {
  name: string;
  installed: boolean;
  version?: string;
  meetsMinimum: boolean;
  required: boolean;
  installUrl: string;
}

async function checkPrerequisite(
  check: PrerequisiteCheck
): Promise<CheckResultInternal> {
  try {
    const result =
      await $`${check.command.split(" ")[0]} ${check.command.split(" ").slice(1)}`.quiet();
    const output = result.stdout.toString().trim();
    const match = output.match(check.versionPattern);

    if (match) {
      const version = match[1];
      const meetsMinimum = compareVersions(version, check.minVersion) >= 0;
      return {
        name: check.name,
        installed: true,
        version,
        meetsMinimum,
        required: check.required,
        installUrl: check.installUrl,
      };
    }

    return {
      name: check.name,
      installed: true,
      meetsMinimum: false,
      required: check.required,
      installUrl: check.installUrl,
    };
  } catch {
    return {
      name: check.name,
      installed: false,
      meetsMinimum: false,
      required: check.required,
      installUrl: check.installUrl,
    };
  }
}

export interface PrerequisitesResult {
  passed: boolean;
  results: CheckResultInternal[];
  missingRequired: string[];
  missingOptional: string[];
}

export async function validatePrerequisites(options: {
  requireDocker?: boolean;
}): Promise<PrerequisitesResult> {
  const checksToRun = checks.map((check) => ({
    ...check,
    required:
      check.name === "Docker"
        ? (options.requireDocker ?? false)
        : check.required,
  }));

  const results = await Promise.all(checksToRun.map(checkPrerequisite));

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const result of results) {
    if (!result.installed || !result.meetsMinimum) {
      if (result.required) {
        missingRequired.push(result.name);
      } else {
        missingOptional.push(result.name);
      }
    }
  }

  return {
    passed: missingRequired.length === 0,
    results,
    missingRequired,
    missingOptional,
  };
}

export function printPrerequisitesResults(result: PrerequisitesResult): void {
  console.log();
  console.log(colors.bold("Prerequisites"));
  console.log();

  for (const check of result.results) {
    if (!check.installed) {
      if (check.required) {
        error(`${check.name}: not installed`);
        info(`  Install: ${colors.cyan(check.installUrl)}`);
      } else {
        warning(`${check.name}: not installed ${colors.dim("(optional)")}`);
      }
    } else if (!check.meetsMinimum) {
      if (check.required) {
        error(`${check.name}: ${check.version} (requires newer version)`);
        info(`  Update: ${colors.cyan(check.installUrl)}`);
      } else {
        warning(
          `${check.name}: ${check.version} ${colors.dim("(optional, update recommended)")}`
        );
      }
    } else {
      success(`${check.name}: ${check.version}`);
    }
  }

  console.log();
}

export async function checkDockerRunning(): Promise<boolean> {
  try {
    await $`docker info`.quiet();
    return true;
  } catch {
    return false;
  }
}
