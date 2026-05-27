import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { assertPathAllowed, normalizeRelativePath } from "./repo-jail.js";

export interface SearchMatch {
  path: string;
  line: number;
  text: string;
}

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "build",
  "coverage",
  ".operator",
  ".actual-data",
]);

const DEFAULT_MAX_MATCHES = 100;
const DEFAULT_MAX_DEPTH = 8;

export async function searchRepository(options: {
  repoRoot: string;
  rootPath: string;
  pattern: string;
  maxMatches?: number;
  maxDepth?: number;
}): Promise<SearchMatch[]> {
  const { repoRoot, pattern } = options;
  const maxMatches = options.maxMatches ?? DEFAULT_MAX_MATCHES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "i");
  } catch {
    throw new Error(`Invalid search pattern: ${pattern}`);
  }

  const absoluteRoot = assertPathAllowed(repoRoot, options.rootPath || ".");
  const matches: SearchMatch[] = [];

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (matches.length >= maxMatches || depth > maxDepth) {
      return;
    }

    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (matches.length >= maxMatches) {
        return;
      }

      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        await walk(join(currentDir, entry.name), depth + 1);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const absoluteFile = join(currentDir, entry.name);
      let fileStat;
      try {
        fileStat = await stat(absoluteFile);
      } catch {
        continue;
      }

      if (fileStat.size > 512_000) {
        continue;
      }

      let rel: string;
      try {
        rel = normalizeRelativePath(repoRoot, absoluteFile);
        assertPathAllowed(repoRoot, rel);
      } catch {
        continue;
      }

      let contents: string;
      try {
        contents = await readFile(absoluteFile, "utf8");
      } catch {
        continue;
      }

      const lines = contents.split("\n");
      lines.forEach((text, index) => {
        if (matches.length >= maxMatches) {
          return;
        }
        if (regex.test(text)) {
          matches.push({ path: rel, line: index + 1, text: text.trimEnd() });
        }
      });
    }
  }

  await walk(absoluteRoot, 0);
  return matches;
}
