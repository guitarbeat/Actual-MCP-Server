import { describe, expect, it } from "vitest";
import { runCommand } from "./subprocess.js";

describe("subprocess", () => {
  it("runs a simple command", async () => {
    const result = await runCommand(process.cwd(), "node", [
      "-e",
      "console.log('ok')",
    ]);
    expect(result.ok).toBe(true);
    expect(result.stdout.trim()).toBe("ok");
  });
});
