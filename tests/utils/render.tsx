import {
  type RenderOptions,
  type RenderResult,
  render,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";

/**
 * Custom render function that includes common providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Add custom provider options here
}

function AllProviders({ children }: { children: ReactNode }) {
  // Wrap with any providers needed for testing
  // e.g., ThemeProvider, AuthProvider, etc.
  return <>{children}</>;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render, userEvent };

/**
 * Wait for an element to be removed from the DOM
 */
export async function waitForElementToBeRemoved(
  callback: () => HTMLElement | null
): Promise<void> {
  const element = callback();
  if (!element) return;

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!callback()) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

/**
 * Create a mock function with typed return value
 */
export function createMockFn<T extends (...args: unknown[]) => unknown>() {
  return vi.fn() as unknown as T;
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for testing async behavior
 */
export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}
