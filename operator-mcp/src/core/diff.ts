import { createHash } from "node:crypto";

export function createUnifiedDiff(
  relativePath: string,
  oldContent: string,
  newContent: string,
): string {
  const header = `--- a/${relativePath}\n+++ b/${relativePath}`;

  if (oldContent === newContent) {
    return `${header}\n@@ No changes @@\n`;
  }

  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const body: string[] = [];

  oldLines.forEach((line) => {
    body.push(`-${line}`);
  });
  newLines.forEach((line) => {
    body.push(`+${line}`);
  });

  return `${header}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n${body.join("\n")}`;
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
