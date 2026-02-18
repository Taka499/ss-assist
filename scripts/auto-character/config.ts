export const STELLASORA_DATA_BASE_URL =
  "https://raw.githubusercontent.com/Hiro420/StellaSoraData/main";

/** Region definitions for fetching language files */
export const REGIONS = [
  { dir: "JP", langDir: "ja_JP", langKey: "ja" },
  { dir: "EN", langDir: "en_US", langKey: "en" },
  { dir: "CN", langDir: "zh_CN", langKey: "zh-Hans" },
  { dir: "TW", langDir: "zh_TW", langKey: "zh-Hant" },
  { dir: "KR", langDir: "ko_KR", langKey: "kr" },
] as const;

/** EET field → Japanese element name */
export const EET_TO_ELEMENT: Record<number, string> = {
  1: "水",
  2: "火",
  3: "地",
  4: "風",
  5: "光",
  6: "闇",
};

/** Grade field → rarity string (used in CSV rarity column) */
export const GRADE_TO_RARITY: Record<number, string> = {
  1: "5",
  2: "4",
};

/** Icon image dimensions */
export const ICON_SIZE = { width: 164, height: 164 } as const;

/**
 * Datamine numeric item IDs → ss-assist string item IDs.
 * Built by cross-referencing Agent.json rewards with existing commissions CSV.
 */
export const ITEM_ID_MAP: Record<number, string> = {
  1: "dorra",
  33001: "prize_egg",
  30002: "exp_trekkers_t1",
  50002: "exp_discs_t1",
  20071: "tier-up_trekkers_a_t1",
  20081: "tier-up_trekkers_b_t1",
  20091: "tier-up_trekkers_c_t1",
  21071: "tier-up_discs_a_t1",
  21081: "tier-up_discs_b_t1",
  21091: "tier-up_discs_c_t1",
  32001: "skill_music_t1",
  32011: "skill_danmaku_t1",
  32021: "skill_fighting_t1",
  32000: "piece_t1",
};

/** CSV column order for characters */
export const CHARACTER_CSV_COLUMNS = [
  "id",
  "name_ja",
  "name_zh-Hans",
  "name_zh-Hant",
  "icon",
  "role",
  "style",
  "faction",
  "element",
  "rarity",
  "name_en",
  "name_kr",
] as const;

/** CSV column order for commissions */
export const COMMISSION_CSV_COLUMNS = [
  "id",
  "name_ja",
  "name_zh-Hans",
  "requiredLevel",
  "base_role",
  "base_style",
  "base_faction",
  "bonus_role",
  "bonus_style",
  "duration_1_hours",
  "duration_1_rewards",
  "duration_1_bonus_rewards",
  "duration_2_hours",
  "duration_2_rewards",
  "duration_2_bonus_rewards",
  "duration_3_hours",
  "duration_3_rewards",
  "duration_3_bonus_rewards",
  "duration_4_hours",
  "duration_4_rewards",
  "duration_4_bonus_rewards",
  "name_zh-Hant",
  "name_en",
  "name_kr",
] as const;

/** TagType → tag category for CSV columns */
export const TAG_TYPE_TO_CATEGORY: Record<number, string> = {
  1: "role",
  2: "style",
  3: "faction",
};

/** Politeness delay (ms) between wikiru requests */
export const WIKIRU_DELAY_MS = 2000;

export const WIKIRU_BASE_URL = "https://stellasora.wikiru.jp";
