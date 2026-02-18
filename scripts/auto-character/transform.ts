import {
  EET_TO_ELEMENT,
  GRADE_TO_RARITY,
  ITEM_ID_MAP,
  TAG_TYPE_TO_CATEGORY,
} from "./config.js";
import type {
  CharacterDataBundle,
  CommissionDataBundle,
  CsvRow,
  DatamineCharacterTag,
  LanguageMap,
  RegionLanguage,
  TransformResult,
} from "./types.js";

// ── Helpers ──

function resolveLanguageKey(langMap: LanguageMap, key: string): string {
  return langMap[key] ?? "";
}

/** Get the Japanese language entry from a region array */
function getJaLang(languages: RegionLanguage[]): RegionLanguage {
  const ja = languages.find((l) => l.langKey === "ja");
  if (!ja) throw new Error("Japanese language data not found");
  return ja;
}

/** Get a language entry by key */
function getLang(
  languages: RegionLanguage[],
  langKey: string
): RegionLanguage | undefined {
  return languages.find((l) => l.langKey === langKey);
}

/** Build a next-sequential-ID generator */
function makeIdGenerator(
  prefix: string,
  existingIds: string[]
): () => string {
  const nums = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  let next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return () => {
    const id = `${prefix}${String(next).padStart(3, "0")}`;
    next++;
    return id;
  };
}

/**
 * Format a single reward entry: [itemId, min, max] → "ssId:min~max" or "ssId:amount"
 */
function formatRewardEntry(
  entry: [number, number, number],
  warnings: string[],
  agentId: number
): string {
  const [itemId, min, max] = entry;
  const ssId = ITEM_ID_MAP[itemId];
  if (!ssId) {
    warnings.push(
      `Agent ${agentId}: unknown item ID ${itemId} in rewards`
    );
    return `unknown_${itemId}:${min}~${max}`;
  }
  if (min === max) return `${ssId}:${min}`;
  return `${ssId}:${min}~${max}`;
}

/**
 * Decode a RewardPreview/BonusPreview JSON string to ss-assist format.
 * Input: "[[1,13200,13200],[33001,1,2]]"
 * Output: "dorra:13200|prize_egg:1~2"
 */
function decodeRewards(
  jsonStr: string | undefined,
  warnings: string[],
  agentId: number
): string {
  if (!jsonStr) return "";
  try {
    const arr = JSON.parse(jsonStr) as [number, number, number][];
    return arr
      .map((entry) => formatRewardEntry(entry, warnings, agentId))
      .join("|");
  } catch {
    warnings.push(`Agent ${agentId}: failed to parse reward JSON: ${jsonStr}`);
    return "";
  }
}

/**
 * Resolve a tag ID to its Japanese label using the language map.
 * Tag ID 101 → localization key "CharacterTag.101.1" → "アタッカー"
 */
function resolveTagName(
  tagId: number,
  jaLang: RegionLanguage
): string {
  const key = `CharacterTag.${tagId}.1`;
  return resolveLanguageKey(jaLang.characterTags, key);
}

/**
 * Strip 「」brackets from a string (used for commission names from Note field).
 */
function stripBrackets(s: string): string {
  return s.replace(/[「」]/g, "");
}

// ── Character transform ──

export function transformCharacters(
  bundle: CharacterDataBundle,
  existingRows: CsvRow[]
): TransformResult {
  const warnings: string[] = [];
  const jaLang = getJaLang(bundle.languages);

  // Build name_ja → existing row lookup
  const existingByName = new Map<string, CsvRow>();
  for (const row of existingRows) {
    existingByName.set(row.name_ja, row);
  }

  const nextId = makeIdGenerator(
    "char-",
    existingRows.map((r) => r.id)
  );

  const rows: CsvRow[] = [];
  const newEntries: TransformResult["newEntries"] = [];

  // CharacterDes contains only released characters
  const desEntries = Object.values(bundle.characterDes);
  // Sort by datamine ID for deterministic ordering
  desEntries.sort((a, b) => a.Id - b.Id);

  for (const des of desEntries) {
    const charId = String(des.Id);
    const char = bundle.characters[charId];
    if (!char) {
      warnings.push(
        `CharacterDes ${charId}: no matching entry in Character.json`
      );
      continue;
    }

    // Resolve Japanese name
    const nameKey = `Character.${charId}.1`;
    const nameJa = resolveLanguageKey(jaLang.characters, nameKey);
    if (!nameJa || nameJa === "???") continue; // Skip unreleased

    // Resolve names in all languages
    const names: Record<string, string> = { ja: nameJa };
    for (const lang of bundle.languages) {
      if (lang.langKey === "ja") continue;
      const name = resolveLanguageKey(lang.characters, nameKey);
      if (name && name !== "???") {
        names[lang.langKey] = name;
      }
    }

    // Resolve tags
    const [roleTagId, styleTagId, factionTagId] = des.Tag;
    const role = resolveTagName(roleTagId, jaLang);
    const style = resolveTagName(styleTagId, jaLang);
    const faction = resolveTagName(factionTagId, jaLang);

    // Map element and rarity
    const element = EET_TO_ELEMENT[char.EET] ?? "";
    const rarity = GRADE_TO_RARITY[char.Grade] ?? "";

    if (!element)
      warnings.push(`Character ${charId} (${nameJa}): unknown EET ${char.EET}`);
    if (!rarity)
      warnings.push(
        `Character ${charId} (${nameJa}): unknown Grade ${char.Grade}`
      );

    // Determine ss-assist ID
    const existing = existingByName.get(nameJa);
    const id = existing ? existing.id : nextId();

    if (!existing) {
      newEntries.push({ id, name_ja: nameJa });
    }

    const row: CsvRow = {
      id,
      name_ja: nameJa,
      "name_zh-Hans": names["zh-Hans"] ?? "",
      "name_zh-Hant": names["zh-Hant"] ?? "",
      icon: `assets/characters/${id}.png`,
      role,
      style,
      faction,
      element,
      rarity,
      name_en: names["en"] ?? "",
      name_kr: names["kr"] ?? "",
    };

    rows.push(row);
  }

  // Sort rows by their ID number for stable output
  rows.sort((a, b) => {
    const numA = parseInt(a.id.replace("char-", ""), 10);
    const numB = parseInt(b.id.replace("char-", ""), 10);
    return numA - numB;
  });

  return { rows, newEntries, warnings };
}

// ── Commission transform ──

export function transformCommissions(
  bundle: CommissionDataBundle,
  existingRows: CsvRow[]
): TransformResult {
  const warnings: string[] = [];
  const jaLang = getJaLang(bundle.languages);

  // Build name_ja → existing row lookup
  const existingByName = new Map<string, CsvRow>();
  for (const row of existingRows) {
    existingByName.set(row.name_ja, row);
  }

  const nextId = makeIdGenerator(
    "m-",
    existingRows.map((r) => r.id)
  );

  const rows: CsvRow[] = [];
  const newEntries: TransformResult["newEntries"] = [];

  const agents = Object.values(bundle.agents);
  // Sort by Id for deterministic ordering
  agents.sort((a, b) => a.Id - b.Id);

  // Build tag lookup: tagId → { jaName, category }
  const tagLookup = new Map<
    number,
    { jaName: string; category: string }
  >();
  for (const tag of Object.values(bundle.characterTags)) {
    const name = resolveTagName(tag.Id, jaLang);
    const category = TAG_TYPE_TO_CATEGORY[tag.TagType];
    if (name && category) {
      tagLookup.set(tag.Id, { jaName: name, category });
    }
  }

  for (const agent of agents) {
    // Resolve commission name from Note field
    // Note field is a localization key like "Agent.100101.1"
    // Language files may use either "Agent.100101.1" or "100101.1" as key
    const noteKey = agent.Note;
    const shortKey = `${agent.Id}.1`;
    const noteRaw =
      resolveLanguageKey(jaLang.agents, noteKey) ||
      resolveLanguageKey(jaLang.agents, shortKey);
    const nameJa = stripBrackets(noteRaw);
    if (!nameJa) {
      warnings.push(`Agent ${agent.Id}: could not resolve Japanese name`);
      continue;
    }

    // Resolve names in all languages — use whichever key format works
    const names: Record<string, string> = { ja: nameJa };
    for (const lang of bundle.languages) {
      if (lang.langKey === "ja") continue;
      const raw =
        resolveLanguageKey(lang.agents, noteKey) ||
        resolveLanguageKey(lang.agents, shortKey);
      const name = stripBrackets(raw);
      if (name) names[lang.langKey] = name;
    }

    // Map Tags (base conditions) to category columns
    const baseTags: Record<string, string[]> = {
      role: [],
      style: [],
      faction: [],
    };
    for (const tagId of agent.Tags) {
      const info = tagLookup.get(tagId);
      if (info) {
        baseTags[info.category].push(info.jaName);
      } else {
        warnings.push(
          `Agent ${agent.Id} (${nameJa}): unknown base tag ID ${tagId}`
        );
      }
    }

    // Map ExtraTags (bonus conditions) to category columns
    const bonusTags: Record<string, string[]> = {
      role: [],
      style: [],
      faction: [],
    };
    for (const tagId of agent.ExtraTags) {
      const info = tagLookup.get(tagId);
      if (info) {
        bonusTags[info.category].push(info.jaName);
      } else {
        warnings.push(
          `Agent ${agent.Id} (${nameJa}): unknown bonus tag ID ${tagId}`
        );
      }
    }

    // Build duration columns
    const timeSlots = [
      { time: agent.Time1, rp: agent.RewardPreview1, bp: agent.BonusPreview1 },
      { time: agent.Time2, rp: agent.RewardPreview2, bp: agent.BonusPreview2 },
      { time: agent.Time3, rp: agent.RewardPreview3, bp: agent.BonusPreview3 },
      { time: agent.Time4, rp: agent.RewardPreview4, bp: agent.BonusPreview4 },
    ];

    // Determine ss-assist ID
    const existing = existingByName.get(nameJa);
    const id = existing ? existing.id : nextId();

    if (!existing) {
      newEntries.push({ id, name_ja: nameJa });
    }

    const row: CsvRow = {
      id,
      name_ja: nameJa,
      "name_zh-Hans": names["zh-Hans"] ?? "",
      requiredLevel: String(agent.Level),
      base_role: baseTags.role.join("|"),
      base_style: baseTags.style.join("|"),
      base_faction: baseTags.faction.join("|"),
      bonus_role: bonusTags.role.join("|"),
      bonus_style: bonusTags.style.join("|"),
      "name_zh-Hant": names["zh-Hant"] ?? "",
      name_en: names["en"] ?? "",
      name_kr: names["kr"] ?? "",
    };

    // Fill duration columns (up to 4)
    for (let i = 0; i < 4; i++) {
      const slot = timeSlots[i];
      const idx = i + 1;
      if (slot.time && slot.time > 0) {
        row[`duration_${idx}_hours`] = String(slot.time / 60);
        row[`duration_${idx}_rewards`] = decodeRewards(
          slot.rp,
          warnings,
          agent.Id
        );
        row[`duration_${idx}_bonus_rewards`] = decodeRewards(
          slot.bp,
          warnings,
          agent.Id
        );
      } else {
        row[`duration_${idx}_hours`] = "";
        row[`duration_${idx}_rewards`] = "";
        row[`duration_${idx}_bonus_rewards`] = "";
      }
    }

    rows.push(row);
  }

  // Sort rows by existing commission order (m-001, m-002, ...) then new ones
  rows.sort((a, b) => {
    const numA = parseInt(a.id.replace("m-", ""), 10);
    const numB = parseInt(b.id.replace("m-", ""), 10);
    return numA - numB;
  });

  return { rows, newEntries, warnings };
}
