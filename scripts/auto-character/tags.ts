import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { TAG_TYPE_TO_CATEGORY } from "./config.js";
import type {
  CharacterDataBundle,
  RegionLanguage,
} from "./types.js";

interface TagSrcEntry {
  id: string;
  ja: string;
}

type TagSrcJson = Record<string, TagSrcEntry[]>;

interface TagI18n {
  [category: string]: {
    [tagId: string]: string;
  };
}

/** Language key for i18n files (datamine langKey → i18n file stem) */
const LANG_TO_I18N: Record<string, string> = {
  en: "en",
  "zh-Hans": "zh-Hans",
  "zh-Hant": "zh-Hant",
};

export interface TagSyncResult {
  newTags: Array<{ category: string; ja: string }>;
  updatedTags: Array<{ category: string; id: string; oldJa: string; newJa: string }>;
  warnings: string[];
}

export function syncTags(
  bundle: CharacterDataBundle,
  tagsSrcPath: string,
  i18nTagsDir: string,
  dryRun: boolean
): TagSyncResult {
  const result: TagSyncResult = {
    newTags: [],
    updatedTags: [],
    warnings: [],
  };

  // Load existing tags.src.json
  const tagsSrc: TagSrcJson = JSON.parse(
    readFileSync(tagsSrcPath, "utf-8")
  );

  // Get Japanese language data
  const jaLang = bundle.languages.find((l) => l.langKey === "ja");
  if (!jaLang) {
    result.warnings.push("Japanese language data not found");
    return result;
  }

  // Build ja→id lookup for each category
  const jaToIdByCategory = new Map<string, Map<string, string>>();
  for (const category of Object.keys(tagsSrc)) {
    const map = new Map<string, string>();
    for (const entry of tagsSrc[category]) {
      map.set(entry.ja, entry.id);
    }
    jaToIdByCategory.set(category, map);
  }

  // Build datamine ja names set by category
  const datamineNamesByCategory = new Map<string, Set<string>>();
  for (const tag of Object.values(bundle.characterTags)) {
    const category = TAG_TYPE_TO_CATEGORY[tag.TagType];
    if (!category) continue;
    const jaName = jaLang.characterTags[tag.Title] ?? "";
    if (!jaName || jaName === "空欄") continue;
    if (!datamineNamesByCategory.has(category)) {
      datamineNamesByCategory.set(category, new Set());
    }
    datamineNamesByCategory.get(category)!.add(jaName);
  }

  // PHASE 1: Detect name corrections (e.g., 恩恵意思→恩恵意志)
  // Find existing tags whose names are NOT in the datamine and pair them
  // with unmatched datamine names in the same category.
  for (const [category, entries] of Object.entries(tagsSrc)) {
    if (!["role", "style", "faction"].includes(category)) continue;
    const datamineNames = datamineNamesByCategory.get(category);
    if (!datamineNames) continue;
    const jaToId = jaToIdByCategory.get(category)!;

    // Find unmatched existing tags and unmatched datamine names
    const unmatchedExisting = entries.filter((e) => !datamineNames.has(e.ja));
    const unmatchedDatamine = [...datamineNames].filter((n) => !jaToId.has(n));

    // Pair them up (1:1 matching by position — works when there's only a small number)
    const pairCount = Math.min(unmatchedExisting.length, unmatchedDatamine.length);
    for (let i = 0; i < pairCount; i++) {
      const entry = unmatchedExisting[i];
      const newName = unmatchedDatamine[i];

      result.updatedTags.push({
        category,
        id: entry.id,
        oldJa: entry.ja,
        newJa: newName,
      });

      // Update the lookup maps
      jaToId.delete(entry.ja);
      entry.ja = newName;
      jaToId.set(newName, entry.id);
    }
  }

  // PHASE 2: Add truly new tags (those not matched to any existing tag)
  for (const tag of Object.values(bundle.characterTags)) {
    const category = TAG_TYPE_TO_CATEGORY[tag.TagType];
    if (!category) continue;

    const jaName = jaLang.characterTags[tag.Title] ?? "";
    if (!jaName || jaName === "空欄") continue;

    const categoryTags = tagsSrc[category];
    if (!categoryTags) continue;

    const jaToId = jaToIdByCategory.get(category);
    if (!jaToId) continue;

    // Skip if already exists (including names we just corrected)
    if (jaToId.has(jaName)) continue;

    const nextNum =
      Math.max(
        ...categoryTags.map((t) => parseInt(t.id.split("-")[1], 10)),
        0
      ) + 1;
    const newId = `${category}-${String(nextNum).padStart(3, "0")}`;

    categoryTags.push({ id: newId, ja: jaName });
    jaToId.set(jaName, newId);
    result.newTags.push({ category, ja: jaName });
  }

  // Write updated tags.src.json
  if (!dryRun && (result.newTags.length > 0 || result.updatedTags.length > 0)) {
    writeFileSync(
      tagsSrcPath,
      JSON.stringify(tagsSrc, null, 2) + "\n",
      "utf-8"
    );
  }

  // Update i18n tag files
  for (const [langKey, fileStem] of Object.entries(LANG_TO_I18N)) {
    const lang = bundle.languages.find((l) => l.langKey === langKey);
    if (!lang) continue;

    const i18nPath = resolve(i18nTagsDir, `${fileStem}.json`);
    const i18n: TagI18n = existsSync(i18nPath)
      ? JSON.parse(readFileSync(i18nPath, "utf-8"))
      : {};

    let changed = false;

    for (const tag of Object.values(bundle.characterTags)) {
      const category = TAG_TYPE_TO_CATEGORY[tag.TagType];
      if (!category) continue;

      const jaName = jaLang.characterTags[tag.Title] ?? "";
      if (!jaName || jaName === "空欄") continue;

      // Find the ss-assist ID for this tag
      const jaToId = jaToIdByCategory.get(category);
      if (!jaToId) continue;
      const ssId = jaToId.get(jaName);
      if (!ssId) continue;

      // Get the translation
      const translation = lang.characterTags[tag.Title] ?? "";
      if (!translation || translation === "空欄") continue;

      // Ensure category exists in i18n
      if (!i18n[category]) i18n[category] = {};

      // Update if different
      if (i18n[category][ssId] !== translation) {
        i18n[category][ssId] = translation;
        changed = true;
      }
    }

    if (changed && !dryRun) {
      writeFileSync(i18nPath, JSON.stringify(i18n, null, 2) + "\n", "utf-8");
    }
  }

  return result;
}
