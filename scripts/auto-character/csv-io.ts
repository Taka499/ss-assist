import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { CsvRow } from "./types.js";

export function readCsv(filePath: string): CsvRow[] {
  if (!existsSync(filePath)) {
    return [];
  }
  const content = readFileSync(filePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
}

export function writeCsv(
  filePath: string,
  rows: CsvRow[],
  columns: readonly string[]
): void {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => row[col] ?? "").join(",")
  );
  // UTF-8, LF line endings, no BOM, trailing newline
  const content = [header, ...lines].join("\n") + "\n";
  writeFileSync(filePath, content, "utf-8");
}
