import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { fetchAllCharacterData, fetchAllCommissionData } from "./fetch.js";
import { readCsv, writeCsv } from "./csv-io.js";
import { transformCharacters, transformCommissions } from "./transform.js";
import { syncTags } from "./tags.js";
import { fetchNewIcons } from "./icons.js";
import {
  CHARACTER_CSV_COLUMNS,
  COMMISSION_CSV_COLUMNS,
} from "./config.js";
import type { SyncResult } from "./types.js";

// ── CLI argument parsing ──

interface CliArgs {
  charactersCsv: string;
  commissionsCsv: string;
  iconsDir: string;
  tagsSrc: string;
  i18nTagsDir: string;
  outputJson: string | null;
  dryRun: boolean;
  skipIcons: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const cwd = process.cwd();

  const opts: CliArgs = {
    charactersCsv: resolve(
      cwd,
      "data-sources/stellasora - characters.csv"
    ),
    commissionsCsv: resolve(
      cwd,
      "data-sources/stellasora - commissions.csv"
    ),
    iconsDir: resolve(cwd, "public/assets/characters"),
    tagsSrc: resolve(cwd, "data/tags.src.json"),
    i18nTagsDir: resolve(cwd, "i18n/tags"),
    outputJson: null,
    dryRun: false,
    skipIcons: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--characters-csv":
        opts.charactersCsv = resolve(cwd, args[++i]);
        break;
      case "--commissions-csv":
        opts.commissionsCsv = resolve(cwd, args[++i]);
        break;
      case "--icons-dir":
        opts.iconsDir = resolve(cwd, args[++i]);
        break;
      case "--tags-src":
        opts.tagsSrc = resolve(cwd, args[++i]);
        break;
      case "--output-json":
        opts.outputJson = resolve(cwd, args[++i]);
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--skip-icons":
        opts.skipIcons = true;
        break;
    }
  }

  return opts;
}

// ── Diff detection ──

function findChangedFields(
  existing: Record<string, string>,
  generated: Record<string, string>,
  columns: readonly string[]
): string[] {
  const changed: string[] = [];
  for (const col of columns) {
    if ((existing[col] ?? "") !== (generated[col] ?? "")) {
      changed.push(col);
    }
  }
  return changed;
}

// ── Main ──

async function main() {
  const args = parseArgs();

  console.log("=== Stella Sora Data Sync ===\n");

  if (args.dryRun) {
    console.log("(dry-run mode — no files will be written)\n");
  }

  // 1. Read existing CSVs
  console.log("[1/5] Reading existing data...");
  const existingChars = readCsv(args.charactersCsv);
  const existingComms = readCsv(args.commissionsCsv);
  console.log(
    `  Existing: ${existingChars.length} characters, ${existingComms.length} commissions\n`
  );

  // 2. Fetch from StellaSoraData
  console.log("[2/5] Fetching from StellaSoraData...");
  const [charBundle, commBundle] = await Promise.all([
    fetchAllCharacterData(),
    fetchAllCommissionData(),
  ]);
  console.log(
    `  Fetched: ${Object.keys(charBundle.characterDes).length} characters, ${Object.keys(commBundle.agents).length} commissions\n`
  );

  // 3. Sync tags first (so CSV generation uses correct tag names)
  console.log("[3/5] Syncing tags...");
  const tagResult = syncTags(
    charBundle,
    args.tagsSrc,
    args.i18nTagsDir,
    args.dryRun
  );
  if (tagResult.newTags.length > 0) {
    console.log(`  New tags: ${tagResult.newTags.map((t) => `${t.category}/${t.ja}`).join(", ")}`);
  }
  if (tagResult.updatedTags.length > 0) {
    console.log(
      `  Updated tags: ${tagResult.updatedTags.map((t) => `${t.id}: ${t.oldJa} → ${t.newJa}`).join(", ")}`
    );
  }
  if (tagResult.newTags.length === 0 && tagResult.updatedTags.length === 0) {
    console.log("  Tags are in sync.");
  }
  console.log();

  // 4. Transform
  console.log("[4/5] Transforming data...");
  const charResult = transformCharacters(charBundle, existingChars);
  const commResult = transformCommissions(commBundle, existingComms);
  console.log(
    `  Transformed: ${charResult.rows.length} characters, ${commResult.rows.length} commissions\n`
  );

  // 5. Compare and report
  console.log("[5/5] Comparing with existing data...\n");

  const result: SyncResult = {
    newCharacters: charResult.newEntries,
    newCommissions: commResult.newEntries,
    updatedCharacters: [],
    updatedCommissions: [],
    newTags: tagResult.newTags.map((t) => ({
      category: t.category,
      ja: t.ja,
    })),
    warnings: [
      ...charResult.warnings,
      ...commResult.warnings,
      ...tagResult.warnings,
    ],
    hasChanges: false,
  };

  // Check for updated characters
  const existingCharById = new Map(existingChars.map((r) => [r.id, r]));
  for (const row of charResult.rows) {
    const existing = existingCharById.get(row.id);
    if (existing) {
      const fields = findChangedFields(
        existing,
        row,
        CHARACTER_CSV_COLUMNS
      );
      if (fields.length > 0) {
        result.updatedCharacters.push({
          id: row.id,
          name_ja: row.name_ja,
          fields,
        });
      }
    }
  }

  // Check for updated commissions
  const existingCommById = new Map(existingComms.map((r) => [r.id, r]));
  for (const row of commResult.rows) {
    const existing = existingCommById.get(row.id);
    if (existing) {
      const fields = findChangedFields(
        existing,
        row,
        COMMISSION_CSV_COLUMNS
      );
      if (fields.length > 0) {
        result.updatedCommissions.push({
          id: row.id,
          name_ja: row.name_ja,
          fields,
        });
      }
    }
  }

  result.hasChanges =
    result.newCharacters.length > 0 ||
    result.newCommissions.length > 0 ||
    result.updatedCharacters.length > 0 ||
    result.updatedCommissions.length > 0 ||
    result.newTags.length > 0 ||
    tagResult.updatedTags.length > 0;

  // Report
  if (result.newCharacters.length > 0) {
    console.log(`NEW CHARACTERS (${result.newCharacters.length}):`);
    for (const c of result.newCharacters) {
      console.log(`  + ${c.id}: ${c.name_ja}`);
    }
    console.log();
  }

  if (result.newCommissions.length > 0) {
    console.log(`NEW COMMISSIONS (${result.newCommissions.length}):`);
    for (const c of result.newCommissions) {
      console.log(`  + ${c.id}: ${c.name_ja}`);
    }
    console.log();
  }

  if (result.updatedCharacters.length > 0) {
    console.log(`UPDATED CHARACTERS (${result.updatedCharacters.length}):`);
    for (const c of result.updatedCharacters) {
      console.log(`  ~ ${c.id}: ${c.name_ja} [${c.fields.join(", ")}]`);
    }
    console.log();
  }

  if (result.updatedCommissions.length > 0) {
    console.log(`UPDATED COMMISSIONS (${result.updatedCommissions.length}):`);
    for (const c of result.updatedCommissions) {
      console.log(`  ~ ${c.id}: ${c.name_ja} [${c.fields.join(", ")}]`);
    }
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log(`WARNINGS (${result.warnings.length}):`);
    for (const w of result.warnings) {
      console.log(`  ! ${w}`);
    }
    console.log();
  }

  if (!result.hasChanges) {
    console.log("No changes detected. Data is in sync.\n");
  }

  // Write files (unless dry-run)
  if (result.hasChanges && !args.dryRun) {
    console.log("Writing updated files...");
    writeCsv(args.charactersCsv, charResult.rows, CHARACTER_CSV_COLUMNS);
    console.log(`  Wrote ${args.charactersCsv}`);

    writeCsv(args.commissionsCsv, commResult.rows, COMMISSION_CSV_COLUMNS);
    console.log(`  Wrote ${args.commissionsCsv}`);

    // Fetch icons for new characters
    if (!args.skipIcons && charResult.newEntries.length > 0) {
      console.log(`\nFetching icons for ${charResult.newEntries.length} new character(s)...`);
      const iconResult = await fetchNewIcons(
        charResult.newEntries,
        args.iconsDir,
        false
      );
      result.warnings.push(...iconResult.warnings);
      if (iconResult.failed.length > 0) {
        console.log(
          `  Warning: ${iconResult.failed.length} icon(s) failed — placeholders created`
        );
      }
    }

    console.log();
  } else if (args.dryRun && charResult.newEntries.length > 0 && !args.skipIcons) {
    console.log("Icons that would be fetched:");
    for (const c of charResult.newEntries) {
      console.log(`  ${c.id}: ${c.name_ja}`);
    }
    console.log();
  }

  // Write summary JSON
  if (args.outputJson) {
    writeFileSync(args.outputJson, JSON.stringify(result, null, 2) + "\n");
    console.log(`Summary written to ${args.outputJson}\n`);
  }

  // Exit code: 0 = changes written, 2 = no changes
  if (!result.hasChanges) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("\nSync failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
