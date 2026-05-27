import { describe, expect, it } from "vitest";
import { createUnifiedDiff } from "./diff.js";

describe("createUnifiedDiff", () => {
  it("reports no changes for identical content", () => {
    const diff = createUnifiedDiff("mcp-server/demo.ts", "same", "same");
    expect(diff).toContain("@@ No changes @@");
  });

  it("includes removed and added lines", () => {
    const diff = createUnifiedDiff("mcp-server/demo.ts", "old\n", "new\n");
    expect(diff).toContain("-old");
    expect(diff).toContain("+new");
  });
});
