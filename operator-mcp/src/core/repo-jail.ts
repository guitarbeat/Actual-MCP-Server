import { existsSync, lstatSync } from "node:fs";
import { dirname, normalize, relative, resolve, sep } from "node:path";

export class RepoJailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepoJailError";
  }
}

const DENY_PATH_SEGMENTS = [
  ".env",
  ".git",
  "node_modules",
  ".operator",
  "build",
  "coverage",
  ".actual-data",
] as const;

const ALLOW_PREFIXES = [
  "mcp-server/",
  "operator-mcp/",
  "docs/",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "AGENTS.md",
  "render.yaml",
  ".gitignore",
  "README.md",
] as const;

const MAX_READ_BYTES = 1_048_576;

export function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

export function resolveRepoPath(repoRoot: string, inputPath: string): string {
  const normalizedInput = inputPath.trim();
  if (!normalizedInput) {
    throw new RepoJailError("Path is required");
  }

  if (normalizedInput.includes("\0")) {
    throw new RepoJailError("Path contains invalid characters");
  }

  const absolute = resolve(repoRoot, normalizedInput);
  const rel = relative(repoRoot, absolute);

  if (rel.startsWith("..") || rel === "..") {
    throw new RepoJailError(`Path escapes repository root: ${inputPath}`);
  }

  return absolute;
}

export function assertPathAllowed(repoRoot: string, inputPath: string): string {
  const absolute = resolveRepoPath(repoRoot, inputPath);
  const rel = toPosixPath(relative(repoRoot, absolute));

  if (rel === "." || rel === "") {
    return absolute;
  }

  const segments = rel.split("/");
  for (const segment of DENY_PATH_SEGMENTS) {
    if (
      segments.includes(segment) ||
      rel === segment ||
      rel.startsWith(`${segment}/`)
    ) {
      throw new RepoJailError(`Path is not allowed: ${inputPath}`);
    }
  }

  const allowed = ALLOW_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(prefix),
  );
  if (!allowed) {
    throw new RepoJailError(
      `Path is outside the operator allowlist. Allowed prefixes: ${ALLOW_PREFIXES.join(", ")}`,
    );
  }

  return absolute;
}

export function assertReadableFile(absolutePath: string): void {
  if (!existsSync(absolutePath)) {
    throw new RepoJailError(`File not found: ${absolutePath}`);
  }

  const stats = lstatSync(absolutePath);
  if (!stats.isFile()) {
    throw new RepoJailError(`Not a file: ${absolutePath}`);
  }

  if (stats.size > MAX_READ_BYTES) {
    throw new RepoJailError(
      `File exceeds maximum read size (${MAX_READ_BYTES} bytes)`,
    );
  }
}

export function getMaxReadBytes(): number {
  return MAX_READ_BYTES;
}

export function getAllowPrefixes(): readonly string[] {
  return ALLOW_PREFIXES;
}

export function getRepoParentPath(absolutePath: string): string {
  return dirname(absolutePath);
}

export function normalizeRelativePath(
  repoRoot: string,
  absolutePath: string,
): string {
  return toPosixPath(relative(repoRoot, absolutePath));
}

export function normalizeInputPath(inputPath: string): string {
  return normalize(inputPath.trim()).replace(/^(\.\/)+/, "");
}
