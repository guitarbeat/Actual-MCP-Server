import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { appendDeployLogEntry, listDeployLogEntries } from "./deploy-log.js";
import { createOperatorConfig } from "./config.js";

describe("deploy-log", () => {
  it("appends and lists deploy log entries", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-deploy-log-"));
    const config = createOperatorConfig({
      repoRoot,
      enableApply: false,
      enableGitWrite: false,
      enableGitPush: false,
      enableDeploy: true,
    });

    await appendDeployLogEntry(config, {
      phase: "prepare",
      ok: true,
      message: "test prepare",
      branch: "cursor/test",
      remote: "origin",
    });

    await appendDeployLogEntry(config, {
      phase: "execute",
      ok: false,
      message: "test execute failed",
    });

    const entries = await listDeployLogEntries(config, 5);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.phase).toBe("execute");
    expect(entries[1]?.phase).toBe("prepare");
  });
});
