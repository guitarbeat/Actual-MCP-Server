import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { assertPathAllowed, RepoJailError } from "./repo-jail.js";

describe("repo-jail", () => {
  it("allows paths under mcp-server", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-repo-"));
    await mkdir(join(repoRoot, "mcp-server", "src"), { recursive: true });
    await writeFile(
      join(repoRoot, "mcp-server", "src", "demo.ts"),
      "export {};\n",
      "utf8",
    );

    const absolute = assertPathAllowed(repoRoot, "mcp-server/src/demo.ts");
    expect(absolute.endsWith("mcp-server/src/demo.ts")).toBe(true);
  });

  it("rejects escaping the repository root", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-repo-"));
    expect(() => assertPathAllowed(repoRoot, "../outside.txt")).toThrow(
      RepoJailError,
    );
  });

  it("rejects node_modules paths", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-repo-"));
    await mkdir(join(repoRoot, "mcp-server", "node_modules"), {
      recursive: true,
    });

    expect(() =>
      assertPathAllowed(repoRoot, "mcp-server/node_modules/pkg/index.js"),
    ).toThrow(RepoJailError);
  });

  it("rejects paths outside the allowlist", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-repo-"));
    await mkdir(join(repoRoot, "secrets"), { recursive: true });

    expect(() => assertPathAllowed(repoRoot, "secrets/local.txt")).toThrow(
      RepoJailError,
    );
  });
});
