import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  assertAllowedBranch,
  getCurrentBranch,
  gitCommit,
  gitStatus,
  GitServiceError,
  isWorkingTreeDirty,
} from "./git-service.js";

function initRepo(dir: string): void {
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "operator@test"], {
    cwd: dir,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.name", "Operator Test"], {
    cwd: dir,
    stdio: "ignore",
  });
}

describe("git-service", () => {
  it("reads git status from an initialized repository", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-git-"));
    initRepo(repoRoot);
    await mkdir(join(repoRoot, "operator-mcp"), { recursive: true });
    await writeFile(join(repoRoot, "operator-mcp", "demo.txt"), "hi\n", "utf8");

    const status = await gitStatus(repoRoot);
    expect(status.stdout).toContain("operator-mcp");
  });

  it("detects dirty working trees from porcelain output", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-git-"));
    initRepo(repoRoot);
    await mkdir(join(repoRoot, "operator-mcp"), { recursive: true });
    await writeFile(join(repoRoot, "operator-mcp", "demo.txt"), "hi\n", "utf8");

    const status = await gitStatus(repoRoot);
    expect(isWorkingTreeDirty(status.stdout)).toBe(true);
  });

  it("enforces allowed branch prefixes", () => {
    expect(() => assertAllowedBranch("main", "cursor/")).toThrow(
      GitServiceError,
    );
    expect(() =>
      assertAllowedBranch("cursor/feature", "cursor/"),
    ).not.toThrow();
  });

  it("creates commits on allowed branches", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "operator-git-"));
    initRepo(repoRoot);
    await mkdir(join(repoRoot, "operator-mcp"), { recursive: true });
    await writeFile(join(repoRoot, "operator-mcp", "demo.txt"), "hi\n", "utf8");
    execFileSync("git", ["add", "operator-mcp/demo.txt"], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    execFileSync("git", ["commit", "-m", "initial"], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    execFileSync("git", ["checkout", "-b", "cursor/test-branch"], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    await writeFile(
      join(repoRoot, "operator-mcp", "demo.txt"),
      "hello\n",
      "utf8",
    );

    const result = await gitCommit(repoRoot, {
      message: "test commit",
      paths: ["operator-mcp/demo.txt"],
      allowedBranchPrefix: "cursor/",
    });
    expect(result.ok).toBe(true);

    const branch = await getCurrentBranch(repoRoot);
    expect(branch).toBe("cursor/test-branch");
  });
});
