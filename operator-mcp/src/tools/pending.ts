import { z } from "zod";
import type { OperatorRuntimeConfig } from "../core/config.js";
import { timingSafeStringEqual } from "../core/auth.js";
import {
  applyPendingRecords,
  discardPendingRecords,
  getPendingRecord,
  listPendingRecords,
  proposeFileChange,
} from "../core/pending-store.js";
import { RepoJailError } from "../core/repo-jail.js";
import { validateOperatorApprovalSecret } from "../core/startup-guard.js";
import {
  errorFromCatch,
  errorResult,
  successResult,
} from "../core/tool-result.js";

export const proposeFileChangeSchema = {
  path: z.string().describe("Repository-relative file path"),
  content: z.string().describe("Proposed full file contents"),
};

export async function handleProposeFileChange(
  config: OperatorRuntimeConfig,
  args: { path: string; content: string },
) {
  try {
    const record = await proposeFileChange(config, args.path, args.content);
    return successResult({
      pendingId: record.id,
      path: record.path,
      diff: record.diff,
      createdAt: record.createdAt,
      message:
        "Change staged. Call apply-pending with approvalSecret after review.",
    });
  } catch (error) {
    if (error instanceof RepoJailError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to stage file change");
  }
}

export async function handleListPending(config: OperatorRuntimeConfig) {
  const records = await listPendingRecords(config.pendingDir);
  return successResult({
    pending: records.map((record) => ({
      id: record.id,
      path: record.path,
      createdAt: record.createdAt,
      diffPreview: record.diff.split("\n").slice(0, 12).join("\n"),
    })),
    count: records.length,
  });
}

export const getPendingSchema = {
  id: z.string().describe("Pending change identifier"),
};

export async function handleGetPending(
  config: OperatorRuntimeConfig,
  args: { id: string },
) {
  const record = await getPendingRecord(config.pendingDir, args.id);
  if (!record) {
    return errorResult(`Pending change not found: ${args.id}`);
  }

  return successResult({ pending: record });
}

export const applyPendingSchema = {
  ids: z
    .array(z.string())
    .min(1)
    .describe("Pending change identifiers to apply"),
  approvalSecret: z
    .string()
    .describe(
      "Must match OPERATOR_APPROVAL_SECRET configured on the operator server",
    ),
};

export async function handleApplyPending(
  config: OperatorRuntimeConfig,
  args: { ids: string[]; approvalSecret: string },
) {
  if (!config.enableApply) {
    return errorResult(
      "apply-pending is disabled. Restart the operator server with --enable-apply.",
      {
        suggestion:
          "Staged changes remain in .operator/pending until apply is enabled and approved.",
      },
    );
  }

  try {
    validateOperatorApprovalSecret(config.approvalSecret);
  } catch (error) {
    return errorFromCatch(error, "Operator approval secret is not configured");
  }

  if (!timingSafeStringEqual(args.approvalSecret, config.approvalSecret)) {
    return errorResult("Invalid approval secret");
  }

  const result = await applyPendingRecords(config, args.ids);
  return successResult({
    applied: result.applied.map((record) => ({
      id: record.id,
      path: record.path,
    })),
    errors: result.errors,
    ok: result.errors.length === 0,
  });
}

export const discardPendingSchema = {
  ids: z
    .array(z.string())
    .min(1)
    .describe("Pending change identifiers to discard"),
};

export async function handleDiscardPending(
  config: OperatorRuntimeConfig,
  args: { ids: string[] },
) {
  const result = await discardPendingRecords(config.pendingDir, args.ids);
  return successResult({
    discarded: result.discarded,
    missing: result.missing,
    ok: result.missing.length === 0,
  });
}
