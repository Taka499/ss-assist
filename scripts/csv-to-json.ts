import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Category, TagDict, TagEntry } from "../src/types/index.js";

const DATA_DIR = resolve(process.cwd(), "data");
const DATA_SOURCES_DIR = resolve(process.cwd(), "data-sources");
const I18N_DIR = resolve(process.cwd(), "i18n");

// ID format validation regex
const ID_PATTERN = /^(role|style|faction|element|rarity)-\d{3}$/;

/**
 * Load and parse JSON file
 */
function loadJSON(filePath: string): any {
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Load CSV file if it exists, otherwise return empty array
 */
function loadCSV(filePath: string): any[] {
  if (!existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}, skipping...`);
    return [];
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse CSV ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save JSON file with pretty formatting
 */
function saveJSON(filePath: string, data: any): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * Convert tags.src.json to tags.json with validation and translation merging
 */
async function convertTags(): Promise<Map<string, string>> {
  console.log("[1/3] Converting tags from data/tags.src.json...");

  const srcPath = resolve(DATA_DIR, "tags.src.json");
  const outPath = resolve(DATA_DIR, "tags.json");

  // Load source tags
  const srcTags = loadJSON(srcPath) as Record<Category, TagEntry[]>;

  // Validate structure
  const categories: Category[] = ["role", "style", "faction", "element", "rarity"];
  for (const category of categories) {
    if (!srcTags[category] || !Array.isArray(srcTags[category])) {
      throw new Error(`Missing or invalid category "${category}" in tags.src.json`);
    }
  }

  // Load translation files
  const zhHansPath = resolve(I18N_DIR, "tags.zh-Hans.json");
  const zhHantPath = resolve(I18N_DIR, "tags.zh-Hant.json");

  const zhHans = existsSync(zhHansPath) ? loadJSON(zhHansPath) : {};
  const zhHant = existsSync(zhHantPath) ? loadJSON(zhHantPath) : {};

  // Build output with translations and create reverse mapping (Japanese → ID)
  const output: TagDict = {
    role: [],
    style: [],
    faction: [],
    element: [],
    rarity: [],
  };

  const jaToId = new Map<string, string>();
  let totalTags = 0;
  let translatedZhHans = 0;
  let translatedZhHant = 0;

  for (const category of categories) {
    for (const tag of srcTags[category]) {
      // Validate ID format
      if (!ID_PATTERN.test(tag.id)) {
        throw new Error(
          `Invalid tag ID format "${tag.id}" in category "${category}". ` +
          `Expected format: ${category}-NNN (e.g., ${category}-001)`
        );
      }

      // Validate ID prefix matches category
      const prefix = tag.id.split("-")[0];
      if (prefix !== category) {
        throw new Error(
          `Tag ID "${tag.id}" has wrong prefix for category "${category}". ` +
          `Expected prefix: ${category}-`
        );
      }

      // Check for duplicate Japanese labels within category
      const key = `${category}:${tag.ja}`;
      if (jaToId.has(key)) {
        throw new Error(
          `Duplicate Japanese label "${tag.ja}" in category "${category}" ` +
          `(IDs: ${jaToId.get(key)} and ${tag.id})`
        );
      }

      jaToId.set(key, tag.id);

      // Build output entry with translations
      const entry: TagEntry = {
        id: tag.id,
        ja: tag.ja,
      };

      // Add Chinese translations if available
      if (zhHans[category] && zhHans[category][tag.ja]) {
        entry["zh-Hans"] = zhHans[category][tag.ja];
        translatedZhHans++;
      }

      if (zhHant[category] && zhHant[category][tag.ja]) {
        entry["zh-Hant"] = zhHant[category][tag.ja];
        translatedZhHant++;
      }

      output[category].push(entry);
      totalTags++;
    }
  }

  // Save output
  saveJSON(outPath, output);

  console.log(`  ✓ Validated ${totalTags} tag IDs across ${categories.length} categories`);
  console.log(`  ✓ Merged ${translatedZhHans} zh-Hans translations`);
  console.log(`  ✓ Merged ${translatedZhHant} zh-Hant translations`);
  console.log(`  ✓ Wrote ${outPath}`);
  console.log();

  return jaToId;
}

/**
 * Convert characters.csv to characters.json
 */
async function convertCharacters(jaToId: Map<string, string>): Promise<void> {
  console.log("[2/3] Converting characters from data-sources/stellasora - characters.csv...");

  const csvPath = resolve(DATA_SOURCES_DIR, "stellasora - characters.csv");
  const outPath = resolve(DATA_DIR, "characters.json");

  const rows = loadCSV(csvPath);
  if (rows.length === 0) {
    console.log("  ⚠️  No character data to convert");
    saveJSON(outPath, []);
    console.log();
    return;
  }

  const output = [];
  const categories: Category[] = ["role", "style", "faction", "element", "rarity"];

  for (const row of rows) {
    const character: any = {
      id: row.id,
      name: {
        ja: row.name_ja,
      },
      icon: row.icon,
      tags: {},
    };

    // Add optional Chinese names
    if (row["name_zh-Hans"]) {
      character.name["zh-Hans"] = row["name_zh-Hans"];
    }
    if (row["name_zh-Hant"]) {
      character.name["zh-Hant"] = row["name_zh-Hant"];
    }

    // Convert tag labels to IDs
    for (const category of categories) {
      if (!row[category]) continue;

      const labels = row[category]
        .split("|")
        .map((s: string) => s.trim())
        .filter(Boolean);

      if (labels.length === 0) continue;

      const tagIds = [];
      for (const label of labels) {
        const key = `${category}:${label}`;
        const tagId = jaToId.get(key);

        if (!tagId) {
          throw new Error(
            `Character "${row.id}" references unknown ${category} tag "${label}". ` +
            `Please add this tag to data/tags.src.json first.`
          );
        }

        tagIds.push(tagId);
      }

      character.tags[category] = tagIds;
    }

    output.push(character);
  }

  saveJSON(outPath, output);

  console.log(`  ✓ Processed ${output.length} characters`);
  console.log(`  ✓ Wrote ${outPath}`);
  console.log();
}

/**
 * Convert missions.csv to missions.json
 */
async function convertMissions(jaToId: Map<string, string>): Promise<void> {
  console.log("[3/3] Converting missions from data-sources/stellasora - missions.csv...");

  const csvPath = resolve(DATA_SOURCES_DIR, "stellasora - missions.csv");
  const outPath = resolve(DATA_DIR, "missions.json");

  const rows = loadCSV(csvPath);
  if (rows.length === 0) {
    console.log("  ⚠️  No mission data to convert");
    saveJSON(outPath, []);
    console.log();
    return;
  }

  const output = [];
  const categories: Category[] = ["role", "style", "faction", "element", "rarity"];

  for (const row of rows) {
    const mission: any = {
      id: row.id,
      name: {
        ja: row.name_ja,
      },
      requiredLevel: parseInt(row.requiredLevel, 10),
      baseConditions: [],
      rewards: [],
    };

    // Add optional Chinese names
    if (row["name_zh-Hans"]) {
      mission.name["zh-Hans"] = row["name_zh-Hans"];
    }
    if (row["name_zh-Hant"]) {
      mission.name["zh-Hant"] = row["name_zh-Hant"];
    }

    // Parse base conditions
    for (const category of categories) {
      const colName = `base_${category}`;
      if (!row[colName]) continue;

      const labels = row[colName]
        .split("|")
        .map((s: string) => s.trim())
        .filter(Boolean);

      if (labels.length === 0) continue;

      const tagIds = [];
      for (const label of labels) {
        const key = `${category}:${label}`;
        const tagId = jaToId.get(key);

        if (!tagId) {
          throw new Error(
            `Mission "${row.id}" baseConditions references unknown ${category} tag "${label}". ` +
            `Please add this tag to data/tags.src.json first.`
          );
        }

        tagIds.push(tagId);
      }

      mission.baseConditions.push({
        category,
        anyOf: tagIds,
      });
    }

    // Parse bonus conditions
    const bonusConditions = [];
    for (const category of categories) {
      const colName = `bonus_${category}`;
      if (!row[colName]) continue;

      const labels = row[colName]
        .split("|")
        .map((s: string) => s.trim())
        .filter(Boolean);

      if (labels.length === 0) continue;

      const tagIds = [];
      for (const label of labels) {
        const key = `${category}:${label}`;
        const tagId = jaToId.get(key);

        if (!tagId) {
          throw new Error(
            `Mission "${row.id}" bonusConditions references unknown ${category} tag "${label}". ` +
            `Please add this tag to data/tags.src.json first.`
          );
        }

        tagIds.push(tagId);
      }

      bonusConditions.push({
        category,
        anyOf: tagIds,
      });
    }

    if (bonusConditions.length > 0) {
      mission.bonusConditions = bonusConditions;
    }

    // Parse rewards
    if (row.rewards) {
      const rewardStrings = row.rewards
        .split("|")
        .map((s: string) => s.trim())
        .filter(Boolean);

      for (const rewardStr of rewardStrings) {
        const parts = rewardStr.split(":");

        if (parts[0] === "gold") {
          mission.rewards.push({
            type: "gold",
            amount: parseInt(parts[1], 10),
          });
        } else if (parts[0] === "item") {
          mission.rewards.push({
            type: "item",
            id: parts[1],
            amount: parseInt(parts[2], 10),
          });
        } else if (parts[0] === "exp") {
          mission.rewards.push({
            type: "exp",
            amount: parseInt(parts[1], 10),
          });
        } else {
          throw new Error(
            `Mission "${row.id}" has unknown reward type "${parts[0]}". ` +
            `Valid types: gold, item, exp`
          );
        }
      }
    }

    output.push(mission);
  }

  saveJSON(outPath, output);

  console.log(`  ✓ Processed ${output.length} missions`);
  console.log(`  ✓ Wrote ${outPath}`);
  console.log();
}

/**
 * Main conversion pipeline
 */
async function main() {
  try {
    console.log("=== CSV to JSON Data Conversion ===\n");

    // Step 1: Convert tags (this creates the Japanese → ID mapping)
    const jaToId = await convertTags();

    // Step 2: Convert characters (uses the mapping)
    await convertCharacters(jaToId);

    // Step 3: Convert missions (uses the mapping)
    await convertMissions(jaToId);

    console.log("✅ Data conversion completed successfully!");
  } catch (error) {
    console.error("\n❌ Conversion failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
