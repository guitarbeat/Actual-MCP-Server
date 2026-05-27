import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { OperatorRuntimeConfig } from "./config.js";
import { createUnifiedDiff, hashContent } from "./diff.js";
import {
  assertPathAllowed,
  normalizeRelativePath,
  RepoJailError,
} from "./repo-jail.js";

export interface PendingChangeRecord {
  id: string;
  path: string;
  createdAt: string;
  baselineSha: string | null;
  diff: string;
  content: string;
}

async function ensurePendingDir(pendingDir: string): Promise<void> {
  await mkdir(pendingDir, { recursive: true });
}

function pendingFilePath(pendingDir: string, id: string): string {
  return join(pendingDir, `${id}.json`);
}

export async function listPendingRecords(
  pendingDir: string,
): Promise<PendingChangeRecord[]> {
  await ensurePendingDir(pendingDir);

  let entries: string[];
  try {
    entries = await readdir(pendingDir);
  } catch {
    return [];
  }

  const records: PendingChangeRecord[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) {
      continue;
    }

    const raw = await readFile(join(pendingDir, entry), "utf8");
    records.push(JSON.parse(raw) as PendingChangeRecord);
  }

  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getPendingRecord(
  pendingDir: string,
  id: string,
): Promise<PendingChangeRecord | null> {
  const filePath = pendingFilePath(pendingDir, id);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as PendingChangeRecord;
  } catch {
    return null;
  }
}

export async function proposeFileChange(
  config: OperatorRuntimeConfig,
  inputPath: string,
  content: string,
): Promise<PendingChangeRecord> {
  const absolute = assertPathAllowed(config.repoRoot, inputPath);
  const relativePath = normalizeRelativePath(config.repoRoot, absolute);

  const previousContent = existsSync(absolute)
    ? readFileSync(absolute, "utf8")
    : "";
  const baselineSha = existsSync(absolute)
    ? hashContent(previousContent)
    : null;
  const diff = createUnifiedDiff(relativePath, previousContent, content);
  const id = randomUUID();
  const record: PendingChangeRecord = {
    id,
    path: relativePath,
    createdAt: new Date().toISOString(),
    baselineSha,
    diff,
    content,
  };

  await ensurePendingDir(config.pendingDir);
  await writeFile(
    pendingFilePath(config.pendingDir, id),
    JSON.stringify(record, null, 2),
    "utf8",
  );

  return record;
}

export async function applyPendingRecords(
  config: OperatorRuntimeConfig,
  ids: string[],
): Promise<{
  applied: PendingChangeRecord[];
  errors: Array<{ id: string; message: string }>;
}> {
  const applied: PendingChangeRecord[] = [];
  const errors: Array<{ id: string; message: string }> = [];

  for (const id of ids) {
    const record = await getPendingRecord(config.pendingDir, id);
    if (!record) {
      errors.push({ id, message: "Pending change not found" });
      continue;
    }

    try {
      const absolute = assertPathAllowed(config.repoRoot, record.path);
      const currentContent = existsSync(absolute)
        ? readFileSync(absolute, "utf8")
        : "";
      const currentSha = existsSync(absolute)
        ? hashContent(currentContent)
        : null;

      if (record.baselineSha !== null && currentSha !== record.baselineSha) {
        throw new RepoJailError(
          "File changed since proposal; discard and re-propose or resolve conflict manually",
        );
      }

      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, record.content, "utf8");
      await rm(pendingFilePath(config.pendingDir, id), { force: true });
      applied.push(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ id, message });
    }
  }

  return { applied, errors };
}

export async function discardPendingRecords(
  pendingDir: string,
  ids: string[],
): Promise<{ discarded: string[]; missing: string[] }> {
  const discarded: string[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const filePath = pendingFilePath(pendingDir, id);
    try {
      await rm(filePath, { force: true });
      discarded.push(id);
    } catch {
      missing.push(id);
    }
  }

  return { discarded, missing };
}
