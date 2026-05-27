import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { assertPathAllowed, normalizeRelativePath } from "./repo-jail.js";

export interface ListedEntry {
  path: string;
  type: "file" | "directory";
}

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "build",
  "coverage",
  ".operator",
  ".actual-data",
]);

export async function listRepositoryEntries(options: {
  repoRoot: string;
  rootPath: string;
  maxDepth?: number;
  maxEntries?: number;
}): Promise<ListedEntry[]> {
  const maxDepth = options.maxDepth ?? 4;
  const maxEntries = options.maxEntries ?? 500;
  const absoluteRoot = assertPathAllowed(
    options.repoRoot,
    options.rootPath || ".",
  );
  const entries: ListedEntry[] = [];

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (entries.length >= maxEntries || depth > maxDepth) {
      return;
    }

    const dirEntries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (entries.length >= maxEntries) {
        return;
      }

      const absolutePath = join(currentDir, entry.name);
      let rel: string;
      try {
        rel = normalizeRelativePath(options.repoRoot, absolutePath);
        assertPathAllowed(options.repoRoot, rel);
      } catch {
        continue;
      }

      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        entries.push({ path: rel, type: "directory" });
        await walk(absolutePath, depth + 1);
        continue;
      }

      if (entry.isFile()) {
        const fileStat = await stat(absolutePath);
        if (!fileStat.isFile()) {
          continue;
        }
        entries.push({ path: rel, type: "file" });
      }
    }
  }

  await walk(absoluteRoot, 0);
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}
