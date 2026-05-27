import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { OperatorRuntimeConfig } from "./config.js";
import type { QualityRunResult } from "./quality-runner.js";

export type DeployLogPhase = "prepare" | "execute";

export interface DeployLogEntry {
  id: string;
  phase: DeployLogPhase;
  at: string;
  ok: boolean;
  branch?: string;
  remote?: string;
  message: string;
  stashed?: boolean;
  stashRef?: string;
  steps?: QualityRunResult[];
  restartRequired?: boolean;
}

export function getDeployLogPath(config: OperatorRuntimeConfig): string {
  return config.deployLogPath;
}

async function ensureDeployLogDir(logPath: string): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
}

export async function appendDeployLogEntry(
  config: OperatorRuntimeConfig,
  entry: Omit<DeployLogEntry, "id" | "at"> & { id?: string; at?: string },
): Promise<DeployLogEntry> {
  const record: DeployLogEntry = {
    id: entry.id ?? randomUUID(),
    at: entry.at ?? new Date().toISOString(),
    phase: entry.phase,
    ok: entry.ok,
    branch: entry.branch,
    remote: entry.remote,
    message: entry.message,
    stashed: entry.stashed,
    stashRef: entry.stashRef,
    steps: entry.steps,
    restartRequired: entry.restartRequired,
  };

  const logPath = getDeployLogPath(config);
  await ensureDeployLogDir(logPath);
  await appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export async function listDeployLogEntries(
  config: OperatorRuntimeConfig,
  limit = 10,
): Promise<DeployLogEntry[]> {
  const logPath = getDeployLogPath(config);

  let raw: string;
  try {
    raw = await readFile(logPath, "utf8");
  } catch {
    return [];
  }

  const entries = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DeployLogEntry);

  return entries.slice(-limit).reverse();
}
