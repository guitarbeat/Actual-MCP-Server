import { mkdtemp, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createOperatorConfig } from "./config.js";
import {
  applyPendingRecords,
  proposeFileChange,
  listPendingRecords,
} from "./pending-store.js";

describe("pending-store", () => {
  it("stages and applies a file change when enabled", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-repo-"));
    await mkdir(join(repoRoot, "operator-mcp"), { recursive: true });

    const config = createOperatorConfig({
      repoRoot,
      enableApply: true,
      approvalSecret: "x".repeat(32),
    });

    const record = await proposeFileChange(
      config,
      "operator-mcp/STAGED.txt",
      "hello from operator\n",
    );

    expect(record.id).toBeTruthy();
    const pending = await listPendingRecords(config.pendingDir);
    expect(pending).toHaveLength(1);

    const result = await applyPendingRecords(config, [record.id]);
    expect(result.errors).toHaveLength(0);
    expect(result.applied).toHaveLength(1);

    const written = await readFile(
      join(repoRoot, "operator-mcp", "STAGED.txt"),
      "utf8",
    );
    expect(written).toBe("hello from operator\n");
    expect(await listPendingRecords(config.pendingDir)).toHaveLength(0);
  });
});
