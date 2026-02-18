// ── Datamine types (from Hiro420/StellaSoraData) ──

export interface DatamineCharacter {
  Id: number;
  Grade: number; // 1=★5, 2=★4
  Class: number; // 1=Attacker, 2=Balancer, 3=Supporter
  EET: number; // 1=水, 2=火, 3=地, 4=風, 5=光, 6=闇
  Faction: number; // Always 1 — real faction is in CharacterDes.Tag
  Visible: boolean;
  Available: boolean;
  Name: string; // Localization key, e.g. "Character.103.1"
}

export interface DatamineCharacterDes {
  Id: number;
  Tag: [number, number, number]; // [roleTagId, styleTagId, factionTagId]
  Force: number;
}

export interface DatamineCharacterTag {
  Id: number;
  Title: string; // Localization key, e.g. "CharacterTag.101.1"
  TagType: number; // 1=role, 2=style, 3=faction
}

export interface DatamineAgent {
  Id: number;
  Tab: number;
  Note: string; // Localization key for display name (with 「」brackets)
  Name: string; // Localization key for quest name
  Level: number;
  MemberLimit: number;
  Tags: number[];
  ExtraTags: number[];
  Quality: number; // 1=初級, 2=中級, 3=上級
  Time1: number; // minutes
  Time2: number;
  Time3?: number; // absent for Tab 5 (game commissions)
  Time4?: number;
  RewardPreview1: string; // JSON-encoded: "[[itemId, min, max], ...]"
  RewardPreview2: string;
  RewardPreview3?: string;
  RewardPreview4?: string;
  BonusPreview1: string;
  BonusPreview2: string;
  BonusPreview3?: string;
  BonusPreview4?: string;
}

// ── Language file types ──

/** Flat key→string mapping, e.g. { "Character.103.1": "コハク" } */
export type LanguageMap = Record<string, string>;

// ── Data bundles fetched from StellaSoraData ──

export interface RegionLanguage {
  langKey: string; // "ja" | "en" | "zh-Hans" | "zh-Hant" | "kr"
  characters: LanguageMap;
  characterTags: LanguageMap;
  agents: LanguageMap;
}

export interface CharacterDataBundle {
  characters: Record<string, DatamineCharacter>;
  characterDes: Record<string, DatamineCharacterDes>;
  characterTags: Record<string, DatamineCharacterTag>;
  languages: RegionLanguage[];
}

export interface CommissionDataBundle {
  agents: Record<string, DatamineAgent>;
  characterTags: Record<string, DatamineCharacterTag>;
  languages: RegionLanguage[];
}

// ── CSV row types ──

export type CsvRow = Record<string, string>;

// ── Transform results ──

export interface TransformResult {
  rows: CsvRow[];
  newEntries: Array<{ id: string; name_ja: string }>;
  warnings: string[];
}

// ── Sync result (written as JSON for CI consumption) ──

export interface SyncResult {
  newCharacters: Array<{ id: string; name_ja: string }>;
  newCommissions: Array<{ id: string; name_ja: string }>;
  updatedCharacters: Array<{ id: string; name_ja: string; fields: string[] }>;
  updatedCommissions: Array<{ id: string; name_ja: string; fields: string[] }>;
  newTags: Array<{ category: string; ja: string }>;
  warnings: string[];
  hasChanges: boolean;
}
