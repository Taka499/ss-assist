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

  // Load translation files from i18n/tags/ directory
  const tagsI18nDir = resolve(I18N_DIR, "tags");
  const zhHansPath = resolve(tagsI18nDir, "zh-Hans.json");
  const zhHantPath = resolve(tagsI18nDir, "zh-Hant.json");
  const enPath = resolve(tagsI18nDir, "en.json");

  const zhHans = existsSync(zhHansPath) ? loadJSON(zhHansPath) : {};
  const zhHant = existsSync(zhHantPath) ? loadJSON(zhHantPath) : {};
  const en = existsSync(enPath) ? loadJSON(enPath) : {};

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
  let translatedEn = 0;

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

      // Add translations if available (using ID-based lookup)
      if (zhHans[category] && zhHans[category][tag.id]) {
        entry["zh-Hans"] = zhHans[category][tag.id];
        translatedZhHans++;
      }

      if (zhHant[category] && zhHant[category][tag.id]) {
        entry["zh-Hant"] = zhHant[category][tag.id];
        translatedZhHant++;
      }

      if (en[category] && en[category][tag.id]) {
        entry["en"] = en[category][tag.id];
        translatedEn++;
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
  console.log(`  ✓ Merged ${translatedEn} English translations`);
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

    // Add optional translations
    if (row["name_zh-Hans"]) {
      character.name["zh-Hans"] = row["name_zh-Hans"];
    }
    if (row["name_zh-Hant"]) {
      character.name["zh-Hant"] = row["name_zh-Hant"];
    }
    if (row["name_en"]) {
      character.name["en"] = row["name_en"];
    }
    if (row["name_kr"]) {
      character.name["kr"] = row["name_kr"];
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
 * Parse amount string with range support
 * Examples: "13200" → {min: 13200, max: 13200}
 *           "1~2" → {min: 1, max: 2}
 *           "13200~" → {min: 13200, max: 13200}
 */
function parseAmount(amountStr: string): { min: number; max: number } {
  const trimmed = amountStr.trim();

  if (trimmed.includes("~")) {
    const parts = trimmed.split("~");
    const min = parseInt(parts[0], 10);
    const max = parts[1] ? parseInt(parts[1], 10) : min;
    return { min, max };
  }

  const value = parseInt(trimmed, 10);
  return { min: value, max: value };
}

/**
 * Parse reward string into Reward objects
 * Format: "itemId:amount" or "itemId:min~max"
 * Multiple rewards: "dorra:13200~|prize_egg:1~2"
 */
function parseRewards(rewardStr: string, missionId: string): any[] {
  if (!rewardStr) return [];

  const rewardStrings = rewardStr
    .split("|")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const rewards = [];
  for (const item of rewardStrings) {
    const parts = item.split(":");
    if (parts.length !== 2) {
      throw new Error(
        `Mission "${missionId}" has malformed reward "${item}". ` +
        `Expected format: itemId:amount (e.g., "dorra:13200" or "prize_egg:1~2")`
      );
    }

    const [itemId, amountStr] = parts;
    rewards.push({
      itemId,
      amount: parseAmount(amountStr),
    });
  }

  return rewards;
}

/**
 * Convert items.csv to items.json
 */
async function convertItems(): Promise<void> {
  console.log("[3/4] Converting items from data-sources/stellasora - items.csv...");

  const csvPath = resolve(DATA_SOURCES_DIR, "stellasora - items.csv");
  const outPath = resolve(DATA_DIR, "items.json");

  const rows = loadCSV(csvPath);
  if (rows.length === 0) {
    console.log("  ⚠️  No item data to convert");
    saveJSON(outPath, []);
    console.log();
    return;
  }

  const output = [];

  for (const row of rows) {
    const item: any = {
      id: row.id,
      name: {
        ja: row.name_ja,
      },
      tier: parseInt(row.tier, 10),
      icon: row.icon,
    };

    // Add optional Chinese names
    if (row["name_zh-Hans"]) {
      item.name["zh-Hans"] = row["name_zh-Hans"];
    }
    if (row["name_zh-Hant"]) {
      item.name["zh-Hant"] = row["name_zh-Hant"];
    }
    if (row["name_en"]) {
      item.name["en"] = row["name_en"];
    }
    if (row["name_kr"]) {
      item.name["kr"] = row["name_kr"];
    }

    output.push(item);
  }

  saveJSON(outPath, output);

  console.log(`  ✓ Processed ${output.length} items`);
  console.log(`  ✓ Wrote ${outPath}`);
  console.log();
}

/**
 * Convert missions.csv to missions.json
 */
async function convertMissions(jaToId: Map<string, string>): Promise<void> {
  console.log("[4/4] Converting missions from data-sources/stellasora - missions.csv...");

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
      durations: [],
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

    // Parse duration options (up to 4 durations per mission)
    for (let i = 1; i <= 4; i++) {
      const hoursCol = `duration_${i}_hours`;
      const rewardsCol = `duration_${i}_rewards`;
      const bonusRewardsCol = `duration_${i}_bonus_rewards`;

      if (!row[hoursCol]) break; // No more durations

      const hours = parseInt(row[hoursCol], 10);
      const rewards = parseRewards(row[rewardsCol] || "", row.id);
      const bonusRewards = parseRewards(row[bonusRewardsCol] || "", row.id);

      mission.durations.push({
        hours,
        rewards,
        bonusRewards,
      });
    }

    if (mission.durations.length === 0) {
      throw new Error(
        `Mission "${row.id}" has no duration options. ` +
        `Please add at least one duration with duration_1_hours, duration_1_rewards columns.`
      );
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

    // Step 3: Convert items (no mapping needed)
    await convertItems();

    // Step 4: Convert missions (uses the mapping)
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
