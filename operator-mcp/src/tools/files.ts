import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { OperatorRuntimeConfig } from "../core/config.js";
import { listRepositoryEntries } from "../core/list-files.js";
import {
  assertPathAllowed,
  assertReadableFile,
  normalizeRelativePath,
  RepoJailError,
} from "../core/repo-jail.js";
import { searchRepository } from "../core/search.js";
import {
  errorFromCatch,
  errorResult,
  successResult,
} from "../core/tool-result.js";

export const readFileSchema = {
  path: z.string().describe("Repository-relative file path"),
};

export async function handleReadFile(
  config: OperatorRuntimeConfig,
  args: { path: string },
) {
  try {
    const absolute = assertPathAllowed(config.repoRoot, args.path);
    assertReadableFile(absolute);
    const content = await readFile(absolute, "utf8");
    return successResult({
      path: normalizeRelativePath(config.repoRoot, absolute),
      content,
      bytes: Buffer.byteLength(content, "utf8"),
    });
  } catch (error) {
    if (error instanceof RepoJailError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to read file");
  }
}

export const listFilesSchema = {
  path: z
    .string()
    .optional()
    .describe("Repository-relative directory path (default: repository root)"),
  maxDepth: z
    .number()
    .int()
    .min(0)
    .max(12)
    .optional()
    .describe("Maximum directory depth"),
  maxEntries: z
    .number()
    .int()
    .min(1)
    .max(2000)
    .optional()
    .describe("Maximum entries returned"),
};

export async function handleListFiles(
  config: OperatorRuntimeConfig,
  args: { path?: string; maxDepth?: number; maxEntries?: number },
) {
  try {
    const entries = await listRepositoryEntries({
      repoRoot: config.repoRoot,
      rootPath: args.path || ".",
      maxDepth: args.maxDepth,
      maxEntries: args.maxEntries,
    });
    return successResult({ entries, count: entries.length });
  } catch (error) {
    if (error instanceof RepoJailError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to list files");
  }
}

export const searchCodeSchema = {
  pattern: z.string().describe("JavaScript regular expression pattern"),
  path: z
    .string()
    .optional()
    .describe(
      "Repository-relative directory to search (default: repository root)",
    ),
  maxMatches: z.number().int().min(1).max(500).optional(),
};

export async function handleSearchCode(
  config: OperatorRuntimeConfig,
  args: { pattern: string; path?: string; maxMatches?: number },
) {
  try {
    const matches = await searchRepository({
      repoRoot: config.repoRoot,
      rootPath: args.path || ".",
      pattern: args.pattern,
      maxMatches: args.maxMatches,
    });
    return successResult({ matches, count: matches.length });
  } catch (error) {
    if (error instanceof RepoJailError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to search repository");
  }
}
