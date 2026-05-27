import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  ok: boolean;
}

interface ExecFileErrorLike {
  code?: number | string;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export async function runCommand(
  cwd: string,
  command: string,
  args: string[],
  options?: { timeoutMs?: number; maxBuffer?: number },
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout: options?.timeoutMs ?? 120_000,
      maxBuffer: options?.maxBuffer ?? 10 * 1024 * 1024,
      encoding: "utf8",
    });

    return {
      exitCode: 0,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      ok: true,
    };
  } catch (error) {
    const execError = error as ExecFileErrorLike;
    const exitCode =
      typeof execError.code === "number"
        ? execError.code
        : Number.parseInt(String(execError.code ?? "1"), 10) || 1;

    return {
      exitCode,
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? execError.message ?? String(error),
      ok: false,
    };
  }
}

export async function runGit(
  repoRoot: string,
  args: string[],
  options?: { timeoutMs?: number },
): Promise<CommandResult> {
  return runCommand(repoRoot, "git", args, options);
}
