/**
 * Terminal UI helpers for setup scripts
 * Uses @clack/prompts for beautiful interactive prompts
 */

import * as p from "@clack/prompts";
import pc from "picocolors";

export { p as prompts };

export const colors = pc;

export function banner(): void {
  console.log();
  console.log(
    pc.cyan(`
  ╭─────────────────────────────────────────╮
  │                                         │
  │     ${pc.bold("AI-Native Boilerplate Setup")}         │
  │                                         │
  ╰─────────────────────────────────────────╯
`)
  );
}

export function success(message: string): void {
  console.log(`${pc.green("✔")} ${message}`);
}

export function error(message: string): void {
  console.log(`${pc.red("✖")} ${message}`);
}

export function warning(message: string): void {
  console.log(`${pc.yellow("⚠")} ${message}`);
}

export function info(message: string): void {
  console.log(`${pc.blue("ℹ")} ${message}`);
}

export function skip(message: string): void {
  console.log(`${pc.dim("⊘")} ${pc.dim(message)}`);
}

export function step(current: number, total: number, message: string): void {
  console.log(`${pc.dim(`[${current}/${total}]`)} ${message}`);
}

export function section(title: string): void {
  console.log();
  console.log(pc.bold(pc.underline(title)));
  console.log();
}

export function divider(): void {
  console.log(pc.dim("─".repeat(50)));
}

export function link(url: string): string {
  return pc.cyan(pc.underline(url));
}

export function mask(value: string, showChars = 4): string {
  if (value.length <= showChars) {
    return "•".repeat(value.length);
  }
  return (
    value.slice(0, showChars) +
    "•".repeat(Math.min(value.length - showChars, 20))
  );
}

export function table(rows: [string, string][]): void {
  const maxKeyLength = Math.max(...rows.map(([key]) => key.length));
  for (const [key, value] of rows) {
    console.log(`  ${pc.dim(key.padEnd(maxKeyLength))}  ${value}`);
  }
}

export interface CheckResult {
  name: string;
  status: "pass" | "fail" | "skip";
  message?: string;
}

export function checkResults(category: string, results: CheckResult[]): void {
  console.log(pc.bold(category));
  for (const result of results) {
    const icon =
      result.status === "pass"
        ? pc.green("✔")
        : result.status === "fail"
          ? pc.red("✖")
          : pc.dim("⊘");
    const name = result.status === "skip" ? pc.dim(result.name) : result.name;
    const message = result.message ? pc.dim(` (${result.message})`) : "";
    console.log(`  ${icon} ${name}${message}`);
  }
  console.log();
}

export function summary(passed: number, failed: number, skipped: number): void {
  divider();
  const parts: string[] = [];
  if (passed > 0) parts.push(pc.green(`${passed} passed`));
  if (failed > 0) parts.push(pc.red(`${failed} failed`));
  if (skipped > 0) parts.push(pc.dim(`${skipped} skipped`));
  console.log(`Summary: ${parts.join(", ")}`);
}
