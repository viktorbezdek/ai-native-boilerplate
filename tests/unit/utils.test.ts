import { cn } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", true && "included", false && "excluded");
    expect(result).toBe("base included");
  });

  it("should handle undefined values", () => {
    const result = cn("base", undefined, "end");
    expect(result).toBe("base end");
  });

  it("should merge Tailwind classes properly", () => {
    const result = cn("px-4 py-2", "px-6");
    expect(result).toBe("py-2 px-6");
  });

  it("should handle object syntax", () => {
    const result = cn("base", {
      active: true,
      disabled: false,
    });
    expect(result).toBe("base active");
  });
});
