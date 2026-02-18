# Automated Character & Commission Data Pipeline via Datamined Game Data

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` at the repository root.


## Purpose / Big Picture

Today, every time a new Stella Sora character or commission is released, a maintainer must manually look up the character's stats on a wiki, fill in a CSV row with 12 fields across 5 languages, find and crop an icon image, and commit the result. Localized names (particularly Traditional Chinese and Korean) are often left blank because the effort to find them is too high.

After this change, a GitHub Actions workflow will automatically detect new characters and commissions by comparing the auto-updating datamined game data repository (Hiro420/StellaSoraData on GitHub) against the current ss-assist data. When differences are found, the workflow produces a Pull Request targeting the `develop` branch that contains the fully populated CSV rows (all 5 languages filled in), the icon image (sourced from the stellasora.wikiru.jp community wiki), and updated tag definitions if new tags appeared. The maintainer's only job is to review and merge the PR.

You can verify success by triggering the workflow manually via `workflow_dispatch` in the GitHub Actions tab. If there are differences between StellaSoraData and the local data, a PR appears on the repository within a few minutes, containing CSV changes, icon images, and a review checklist. If data is already in sync, the workflow exits cleanly with a "no new data" message.


## Progress

- [x] Read and understand this plan fully. (2026-02-18)
- [x] Milestone 0: Prototype — validate datamine access and schema mapping. (2026-02-18)
- [x] Milestone 1: Sync script — character data generation. (2026-02-18)
- [x] Milestone 2: Sync script — commission data generation. (2026-02-18)
- [x] Milestone 3: Sync script — tag generation, icon fetching. (2026-02-18)
- [x] Milestone 4: GitHub Actions workflow. (2026-02-18)
- [x] Milestone 5: Integration testing and hardening. (2026-02-18)


## Surprises & Discoveries

- Discovery: The faction tag "恩恵意思" in tags.src.json is incorrect; the datamine ground truth is "恩恵意志" (志 vs 思). The sync script's tag correction logic detects and fixes this automatically.
  Date: 2026-02-18

- Discovery: Agent language file keys use the Note field value directly (e.g., "Agent.100101.1"), not a shortened form. The sync tries both the full key and a `${id}.1` fallback for robustness.
  Date: 2026-02-18

- Discovery: Tab 5 commissions (game quests: 音楽/弾幕/格闘) have only Time1/Time2 fields (not Time3/Time4). The transform handles this by treating undefined/0 time slots as empty.
  Date: 2026-02-18

- Discovery: Commission reward data (RewardPreview) from the datamine differs from hand-curated CSV values for prize_egg ranges in durations 2-4. The datamine has wider ranges. Since the datamine is ground truth, these are treated as corrections.
  Date: 2026-02-18

- Discovery: All 29 existing characters had empty name_zh-Hant (Traditional Chinese) columns. The datamine TW language files provide complete zh-Hant names for all characters, filling this gap automatically.
  Date: 2026-02-18

- Discovery: クルニス（華服） is a new character variant present in the datamine but not in the CSV. Detected automatically by the sync.
  Date: 2026-02-18

- Discovery: The pre-existing test `useAppStore > should remove character when toggling owned character` was already failing before our changes (Zustand store level retention issue). Not related to this pipeline.
  Date: 2026-02-18


## Decision Log

- Decision: Use StellaSoraData (datamined game data) as the primary data source instead of Game8 or wikiru scraping.
  Rationale: StellaSoraData is ground-truth game data that auto-updates, provides all 5 languages, includes both character and commission data, and uses accurate in-game values (no faction discrepancy like Game8). Investigation confirmed all required fields are present: Character.json (59 chars), CharacterDes.json (tag mappings), CharacterTag.json (27 tags), Agent.json (36 commissions), and language files for JP/EN/CN/TW/KR.
  Date/Author: 2026-02-18

- Decision: Use wikiru for character icon images rather than Game8.
  Rationale: Game8 thumbnails are small (~100px) and would require upscaling to 164x164, producing blurry results. Wikiru hosts character images via its internal attachment system. Wikiru pages are confirmed accessible (no anti-bot blocking despite the original plan's claim).
  Date/Author: 2026-02-18

- Decision: Write the sync script in TypeScript, not Python.
  Rationale: The entire project is TypeScript/Node.js. All existing scripts (csv-to-json.ts, validate-data.ts, slug.ts) are TypeScript run via tsx. Adding Python would introduce a second runtime, a second package manager (pip), and force contributors to know both languages. TypeScript equivalents exist: native fetch() for HTTP, cheerio for HTML parsing, sharp for image processing.
  Date/Author: 2026-02-18

- Decision: Keep CSV as the committed intermediate format (generate CSV from datamine, then existing build:data converts CSV to JSON).
  Rationale: This preserves the existing data pipeline, keeps human-readable diffs in PRs, and requires no changes to the React app or build process. The CSV files shift from "human-edited source of truth" to "generated from datamine", but the downstream pipeline is unchanged.
  Date/Author: 2026-02-18

- Decision: Target PR to `develop` branch, not `main`.
  Rationale: The project uses git-flow (develop for development, main for production). Auto-PRs must follow the same flow. The existing release process (npm version → push develop → PR to main) handles promotion.
  Date/Author: 2026-02-18

- Decision: Use wikiru RSS feed as a lightweight change-detection signal, with full diff against StellaSoraData as the authoritative check.
  Rationale: Wikiru RSS (`?cmd=rss`) provides a feed of recent wiki edits, which typically happen shortly after game patches. This is a good "should we even bother checking" signal. But the actual data comparison is always against StellaSoraData, which is the ground truth.
  Date/Author: 2026-02-18


## Outcomes & Retrospective

Implementation completed 2026-02-18. All milestones achieved in a single session.

**Files created:**
- `scripts/auto-character/types.ts` — TypeScript interfaces for datamine data
- `scripts/auto-character/config.ts` — Constants, ID mappings (14 items), CSV column definitions
- `scripts/auto-character/fetch.ts` — StellaSoraData fetching with parallel region downloads
- `scripts/auto-character/csv-io.ts` — CSV read/write preserving format
- `scripts/auto-character/transform.ts` — Character and commission data transformation
- `scripts/auto-character/tags.ts` — Tag sync with correction detection (恩恵意思→恩恵意志)
- `scripts/auto-character/icons.ts` — Wikiru icon fetching with cheerio + sharp
- `scripts/auto-character/sync.ts` — Main orchestrator with CLI args, diff detection, reporting
- `scripts/auto-character/sync.test.ts` — 11 Vitest tests covering transforms and edge cases
- `.github/workflows/auto-character.yml` — Daily cron + manual trigger, creates PRs via peter-evans/create-pull-request

**Validation results (dry-run):**
- 30 characters transformed (29 existing + 1 new: クルニス（華服）)
- 36 commissions transformed (all matched)
- Tag correction detected: faction-004 恩恵意思→恩恵意志
- All 29 existing chars get new name_zh-Hant data
- Several chars/comms get new name_en, name_kr data
- Commission reward ranges updated from ground-truth datamine

**Test results:**
- 11 new tests: all pass
- 166 existing tests: all pass (1 pre-existing failure unrelated to this work)


## Context and Orientation

This section describes the current state of the repository and the external data sources in enough detail that a reader with no prior context can implement the plan.

### Repository structure relevant to this plan

The repository is a Vite + React + TypeScript SPA deployed to GitHub Pages. It helps Stella Sora players optimize character combinations for in-game commissions (dispatch missions where you assign characters based on tag-matching conditions).

The data pipeline works like this: human-editable CSV files in `data-sources/` are converted to JSON files in `data/` by a TypeScript script, then consumed by the React app. JSON files are gitignored and regenerated in CI.

Key files:

    data-sources/stellasora - characters.csv
      29 rows (char-001 through char-029), 12 columns:
      id, name_ja, name_zh-Hans, name_zh-Hant, icon, role, style, faction, element, rarity, name_en, name_kr

    data-sources/stellasora - commissions.csv
      36 rows (m-001 through m-036), columns include:
      id, name_ja, name_zh-Hans, requiredLevel, base_role, base_style, base_faction,
      bonus_role, bonus_style, duration_1_hours through duration_4_hours with rewards, etc.

    data/tags.src.json
      Defines 5 tag categories (role, style, faction, element, rarity) with string IDs
      like "role-001" and Japanese labels like "バランサー". This is committed (not gitignored).

    i18n/tags/en.json, i18n/tags/zh-Hans.json, i18n/tags/zh-Hant.json
      Tag translations keyed by tag ID.

    scripts/csv-to-json.ts
      Converts CSV → JSON. Maps Japanese tag labels to tag IDs using a reverse lookup
      from tags.src.json. Run via: npm run build:data

    scripts/validate-data.ts
      Validates generated JSON against AJV schemas and cross-validates tag references.
      Run via: npm run validate:data

    .github/workflows/pages.yml
      Deployment workflow: installs deps → build:data → validate:data → vite build → deploy.
      Triggers on pushes to main when package.json changes.

    public/assets/characters/char-001.png through char-029.png
      Character icon images, 164x164 PNG, RGBA.

    package.json
      Uses npm. Key dev dependencies: tsx (for running TypeScript scripts), csv-parse,
      vitest. No Python dependencies.

### External data source: Hiro420/StellaSoraData

This is a GitHub repository containing datamined game configuration files from Stella Sora. It auto-updates (automated commits by user "Hiro" after game patches). It has 38 stars, was created 2025-10-27, and was last pushed 2026-02-09. The default branch is `main`.

The repository contains per-region directories (JP, EN, CN, TW, KR), each with `bin/` (game config JSON) and `language/` (localization JSON) subdirectories. All regions share the same bin schema; the language files provide localized strings.

Key files and their schemas (all paths relative to the StellaSoraData repo root):

**JP/bin/Character.json** — 59 character entries (includes unreleased characters marked "???" in language files). Each entry is keyed by numeric ID (e.g., "103") and contains:

    Id: number           — Game internal character ID (e.g., 103)
    Grade: number        — Rarity. 1 = ★5, 2 = ★4.
    Class: number        — Role. 1 = Attacker, 2 = Balancer, 3 = Supporter.
    EET: number          — Element. 1=水, 2=火, 3=地, 4=風, 5=光, 6=闇.
    Faction: number      — Always 1 (not the actual faction; see CharacterDes for real faction).
    Visible: boolean     — Whether the character is visible in game.
    Available: boolean   — Whether the character is obtainable.
    Name: string         — Localization key, e.g., "Character.103.1".

**JP/bin/CharacterDes.json** — 40 entries (released characters only). Contains the character-to-tag mapping. Each entry:

    Id: number           — Same as Character.json Id.
    Tag: number[]        — Array of 3 tag IDs: [roleTagId, styleTagId, factionTagId].
                           E.g., [101, 201, 301] = [アタッカー, 収集家, 空白旅団].
    Force: number        — Force/faction group ID (maps to Force.json, but we use Tag instead).

**JP/bin/CharacterTag.json** — 27 tag entries. Each entry:

    Id: number           — Tag ID. 101-104 are roles (TagType 1), 201-206 are styles (TagType 2),
                           301-317 are factions (TagType 3).
    Title: string        — Localization key, e.g., "CharacterTag.101.1".
    TagType: number      — 1 = role, 2 = style, 3 = faction.

Tag ID to Japanese name mapping (from JP/language/ja_JP/CharacterTag.json):

    Roles (TagType 1):     101=アタッカー, 102=バランサー, 103=サポーター, 104=空欄(blank)
    Styles (TagType 2):    201=収集家, 202=しっかり者, 203=冒険家, 204=独創性, 205=知的好奇心, 206=空欄
    Factions (TagType 3):  301=空白旅団, 302=帝国護衛隊, 303=劇団白猫, 304=アグリ・ユニオン,
                           305=白沢管理局, 306=地理協会, 307=鳳凰炒飯, 308=谷風家政,
                           309=ヨロズ配達, 310=その他, 311=ウィンドアッシュ, 312=レッドアイズ,
                           313=空欄, 314=雲笈文化, 315=恩恵意志, 316=花咲旅団, 317=ムーナワークス

**JP/bin/Agent.json** — 36 commission entries. This is the dispatch/commission system. Each entry:

    Id: number             — E.g., 100101
    Tab: number            — Category tab (2-5, maps to AgentTab.json)
    Name: string           — Localization key for commission name
    Level: number          — Required character level
    MemberLimit: number    — Party size (always 3)
    Tags: number[]         — Base condition tag IDs, e.g., [102] = [バランサー]
    ExtraTags: number[]    — Bonus condition tag IDs, e.g., [204] = [独創性]
    Quality: number        — Commission quality/tier (1-3)
    Time1-Time4: number    — Duration options in minutes (240=4h, 480=8h, 720=12h, 1200=20h)
    RewardPreview1-4: string — JSON-encoded reward arrays: "[[itemId, min, max], ...]"
    BonusPreview1-4: string  — JSON-encoded bonus reward arrays

Verified mapping: Agent 100101 maps exactly to ss-assist commission m-001 (資金獲得 初級):
Tags [102]=バランサー matches base_role=バランサー, ExtraTags [204]=独創性 matches bonus_style=独創性,
Level 1 matches requiredLevel=1, Time1=240 matches duration_1_hours=4, etc.

**Language files** — Five regional variants, each with the same key structure:

    JP/language/ja_JP/Character.json    — "Character.103.1": "コハク"
    EN/language/en_US/Character.json    — "Character.103.1": "Amber"
    CN/language/zh_CN/Character.json    — "Character.103.1": "琥珀"
    TW/language/zh_TW/Character.json    — "Character.103.1": "琥珀" (Traditional Chinese)
    KR/language/ko_KR/Character.json    — "Character.103.1": "코하쿠"

    Same pattern for CharacterTag and Agent language files.

Unreleased characters have "???" as their name in all language files.

### External data source: stellasora.wikiru.jp

A PukiWiki-based community wiki. Confirmed accessible with no anti-bot blocking. Provides:

- Character pages with icon images via the wiki's attachment system (attach2/ URLs)
- RSS feed at `?cmd=rss` (15 most recent page edits, useful for change detection)
- Source markup at `?cmd=source&page=PAGE` (machine-parseable PukiWiki markup)
- Character list pages at `?★5` and `?★4` with sortable tables

Icon images are hosted on wikiru's internal attachment system. To fetch a character's icon, we load the character's wiki page and extract the character portrait image URL from the page markup.

### ID mapping between StellaSoraData and ss-assist

The datamine uses numeric IDs (103 for コハク) while ss-assist uses sequential string IDs (char-001 for セイナ). A static mapping table is needed. For existing characters, this is a one-time setup. For new characters (those not yet in ss-assist), the sync script assigns the next sequential char-NNN ID.

Similarly, commission IDs differ: Agent.json uses 100101 while ss-assist uses m-001. The same mapping approach applies.

Tag IDs also differ: datamine uses 101 (アタッカー) while ss-assist uses "role-002". A mapping table bridges these. Since the Japanese labels are identical in both systems, the mapping can be built by matching labels.

For reward items in Agent.json, the datamine uses numeric item IDs (1 for currency/dorra, 33001 for prize_egg, etc.). A one-time item ID mapping table translates these to ss-assist's string item IDs.


## Plan of Work

The implementation is organized into 6 milestones, each independently verifiable.

### Milestone 0: Prototype — Validate datamine access and schema mapping

This milestone proves that we can fetch StellaSoraData files from GitHub, parse them, and produce the correct mappings to ss-assist's data format. No permanent code is written; this is a throwaway validation script.

Create a temporary script at `scripts/auto-character/prototype.ts` that:

1. Fetches `JP/bin/Character.json`, `JP/bin/CharacterDes.json`, `JP/bin/CharacterTag.json`, and `JP/bin/Agent.json` from the StellaSoraData repository via raw GitHub URLs (e.g., `https://raw.githubusercontent.com/Hiro420/StellaSoraData/main/JP/bin/Character.json`).

2. Fetches `JP/language/ja_JP/Character.json` and `JP/language/ja_JP/CharacterTag.json` for name resolution.

3. For each character in CharacterDes.json: resolves the Tag array to Japanese labels via CharacterTag language file, resolves the character name via Character language file, and prints the result. Then compares this against the existing `data-sources/stellasora - characters.csv` to verify that the mappings produce identical data for all 29 existing characters.

4. For the first 3 commissions in Agent.json: resolves Tags and ExtraTags to Japanese labels, converts Time1-4 from minutes to hours, decodes RewardPreview strings, and compares against the first 3 rows of `data-sources/stellasora - commissions.csv`.

5. Prints any discrepancies found.

The expected output is zero discrepancies for characters and commissions, confirming that the datamine data matches the hand-curated CSV data exactly (or documenting any real differences that need resolution).

Run the prototype:

    cd /path/to/ss-assist
    npx tsx scripts/auto-character/prototype.ts

The prototype is deleted after validation.

### Milestone 1: Sync script — Character data generation

This milestone creates the core sync script that fetches character data from StellaSoraData and generates the characters CSV. At the end of this milestone, running the sync script produces a CSV file identical to the existing hand-curated one (for existing characters) and would include any new characters from the datamine.

Create the following files:

**`scripts/auto-character/config.ts`** — Constants and mapping tables.

Contains:
- `STELLASORA_DATA_BASE_URL`: the raw GitHub URL prefix for StellaSoraData (`https://raw.githubusercontent.com/Hiro420/StellaSoraData/main`).
- `REGIONS`: array of `{ dir: 'JP', langDir: 'ja_JP', langKey: 'ja' }` etc. for all 5 regions.
- `EET_TO_ELEMENT`: maps datamine EET numbers to Japanese element names: `{ 1: '水', 2: '火', 3: '地', 4: '風', 5: '光', 6: '闇' }`.
- `GRADE_TO_RARITY`: maps datamine Grade to rarity string: `{ 1: '5', 2: '4' }`.
- `ICON_SIZE`: `{ width: 164, height: 164 }`.
- `ITEM_ID_MAP`: maps datamine numeric item IDs to ss-assist item string IDs. To be populated during Milestone 0 prototyping by cross-referencing Agent.json rewards with existing commissions CSV. For example: `{ 1: 'dorra', 33001: 'prize_egg', ... }`.

**`scripts/auto-character/fetch.ts`** — Fetches JSON files from StellaSoraData.

Exports async functions:
- `fetchJSON<T>(relativePath: string): Promise<T>` — Fetches a single JSON file from StellaSoraData using `STELLASORA_DATA_BASE_URL + '/' + relativePath`. Uses native `fetch()`. Throws on non-200 responses.
- `fetchAllCharacterData(): Promise<CharacterDataBundle>` — Fetches Character.json, CharacterDes.json, CharacterTag.json, and all 5 language files for characters and tags in parallel. Returns a typed bundle.
- `fetchAllCommissionData(): Promise<CommissionDataBundle>` — Fetches Agent.json, AgentTab.json, and all 5 Agent language files. Returns a typed bundle.

**`scripts/auto-character/types.ts`** — TypeScript interfaces for datamine data structures.

Defines interfaces for: `DatamineCharacter`, `DatamineCharacterDes`, `DatamineCharacterTag`, `DatamineAgent`, `CharacterDataBundle`, `CommissionDataBundle`, `SyncResult`.

**`scripts/auto-character/transform.ts`** — Transforms datamine data to ss-assist CSV format.

The core logic. Exports:
- `transformCharacters(bundle: CharacterDataBundle, existingCsv: CsvRow[]): TransformResult` — For each character in CharacterDes.json (which contains only released characters), builds a CSV row by:
  1. Looking up the character name in each of the 5 language files using the localization key pattern `Character.{id}.1`.
  2. Looking up the 3 tag IDs from the `Tag` array in CharacterTag language files using `CharacterTag.{tagId}.1`.
  3. Mapping the tag labels to ss-assist tag category names (the first tag is always the role, second is style, third is faction, matching TagType 1/2/3).
  4. Looking up element from Character.json EET field via `EET_TO_ELEMENT`.
  5. Looking up rarity from Character.json Grade field via `GRADE_TO_RARITY`.
  6. Assigning a char-NNN ID: if the character already exists in the CSV (matched by `name_ja`), uses the existing ID. If new, assigns the next sequential ID.
  7. Setting the icon path to `assets/characters/{id}.png`.
  8. Skipping characters whose name is "???" in all language files (unreleased).
  Returns the list of CSV rows and a list of new characters (those not in the existing CSV).

- `transformCommissions(bundle: CommissionDataBundle, existingCsv: CsvRow[]): TransformResult` — Similar logic for Agent.json. Maps Tags/ExtraTags to tag category columns, converts Time1-4 from minutes to hours, decodes RewardPreview JSON strings to the ss-assist reward format (`itemId:min~max`), assigns m-NNN IDs.

**`scripts/auto-character/csv-io.ts`** — Reads and writes CSV files preserving the existing format.

Uses the `csv-parse` package (already a devDependency) for reading. Writes CSV manually to ensure UTF-8 encoding, LF line endings, no BOM, and exact column ordering matching the existing files. The column order for characters is: `id,name_ja,name_zh-Hans,name_zh-Hant,icon,role,style,faction,element,rarity,name_en,name_kr`. The column order for commissions matches the existing commissions CSV header.

**`scripts/auto-character/sync.ts`** — Main orchestrator.

Accepts command-line arguments:
- `--characters-csv PATH` — Path to characters CSV (default: `data-sources/stellasora - characters.csv`)
- `--commissions-csv PATH` — Path to commissions CSV (default: `data-sources/stellasora - commissions.csv`)
- `--icons-dir PATH` — Path to icon directory (default: `public/assets/characters`)
- `--tags-src PATH` — Path to tags.src.json (default: `data/tags.src.json`)
- `--output-json PATH` — Path to write summary JSON (for CI consumption)
- `--dry-run` — Print what would change without writing files
- `--skip-icons` — Skip icon download (useful for CI testing)

The orchestrator:
1. Reads existing CSV files.
2. Fetches all data from StellaSoraData.
3. Transforms to ss-assist format.
4. Compares against existing data.
5. If differences found: writes updated CSV files, downloads new icons (Milestone 3), updates tags if needed (Milestone 3), writes a summary JSON file listing all changes.
6. Exits with code 0 if changes were made, code 2 if no changes.

Add an npm script to package.json: `"sync:data": "tsx scripts/auto-character/sync.ts"`.

At the end of this milestone, running `npm run sync:data -- --dry-run` should print a comparison showing that the generated character data matches the existing CSV, and would list any characters present in the datamine but missing from the CSV.

### Milestone 2: Sync script — Commission data generation

This milestone extends the sync script to also regenerate the commissions CSV from Agent.json. The Agent.json commission data uses tag IDs (same as CharacterTag) for base conditions (Tags field) and bonus conditions (ExtraTags field), and stores durations in minutes and rewards as JSON-encoded arrays.

The key transformation in `transform.ts` for commissions:

The `Tags` array in Agent.json contains CharacterTag IDs for base conditions. The `ExtraTags` array contains CharacterTag IDs for bonus conditions. To map these to CSV columns (base_role, base_style, base_faction, bonus_role, bonus_style, bonus_faction), the script must determine which category each tag belongs to by looking up the tag's `TagType` in CharacterTag.json (1=role, 2=style, 3=faction). Multiple tags of the same category are joined with `|` (e.g., `アタッカー|バランサー`).

Reward strings like `"[[1,13200,13200],[33001,1,2]]"` are decoded to the ss-assist format `dorra:13200|prize_egg:1~2` using the `ITEM_ID_MAP` from config.ts. When min equals max, only one number is written (e.g., `dorra:13200`). When they differ, the range format is used (e.g., `prize_egg:1~2`).

The item ID map must be established during Milestone 0 by comparing Agent.json reward item IDs against existing commission CSV reward strings. This is a one-time mapping that covers all item types used in commissions.

At the end of this milestone, running `npm run sync:data -- --dry-run` should show that both characters AND commissions match the existing CSVs.

### Milestone 3: Sync script — Tag generation and icon fetching

This milestone adds two capabilities: auto-generating `data/tags.src.json` and the tag i18n files from CharacterTag data, and downloading character icons from wikiru.

**Tag generation**: When new tags appear in CharacterTag.json that don't exist in the current tags.src.json, the sync script adds them. New tags get the next sequential ID in their category (e.g., if faction-016 exists, a new faction gets faction-017). The sync script also generates/updates `i18n/tags/en.json`, `i18n/tags/zh-Hans.json`, and `i18n/tags/zh-Hant.json` from the CharacterTag language files across all regions. Note that tags.src.json uses `ja` for the Japanese label key, while the i18n files are keyed by tag ID within category.

**Icon fetching**: For each new character (not present in the existing CSV), the sync script fetches the character's icon from wikiru. The process:

1. Construct the wikiru page URL for the character: `https://stellasora.wikiru.jp/?{encodedCharacterName}` where the character name is URL-encoded (e.g., `?コハク` becomes `?%E3%82%B3%E3%83%8F%E3%82%AF`).
2. Fetch the page HTML.
3. Parse the HTML with cheerio to find the character's icon image. The character portrait is typically the first large image on the page, served from wikiru's attachment system.
4. Download the image.
5. Resize to 164x164 pixels using the `sharp` library (to be added as a devDependency) and save as PNG to `public/assets/characters/{id}.png`.
6. If the image cannot be found or downloaded, create a placeholder and add a warning to the summary output.

Add `cheerio` and `sharp` as devDependencies:

    npm install --save-dev cheerio sharp @types/cheerio

At the end of this milestone, running `npm run sync:data` (without --dry-run) should produce complete CSV files with all data, plus icon images for any new characters.

### Milestone 4: GitHub Actions workflow

This milestone creates the CI workflow that automates the entire pipeline. Create `.github/workflows/auto-character.yml`:

The workflow:
1. Triggers on `schedule` (daily cron at `0 14 * * *`, which is 23:00 JST) and `workflow_dispatch` (manual trigger).
2. Checks out the `develop` branch explicitly.
3. Sets up Node.js (same version as pages.yml).
4. Installs dependencies with `npm ci`.
5. Runs the sync script: `npm run sync:data -- --output-json /tmp/sync-result.json`.
6. If exit code is 2 (no changes), the workflow ends.
7. If changes were found (exit code 0), runs `npm run build:data && npm run validate:data` to verify the generated data is valid.
8. Uses `peter-evans/create-pull-request@v6` to create a PR from the changes:
   - `base: develop`
   - `branch: auto/sync-data-{run_number}`
   - `delete-branch: true`
   - Title and body generated from the sync-result.json summary
   - The PR body includes a checklist for the reviewer: verify icon quality, verify any new faction names, check for any warnings from the sync script.

The reason we use `peter-evans/create-pull-request` rather than the `gh` CLI is idempotency: if the workflow runs again before a previous auto-PR is merged, the action updates the existing PR rather than creating a duplicate. This also handles the race condition where multiple characters release between PR reviews.

Permissions required:

    permissions:
      contents: write
      pull-requests: write

Note about GITHUB_TOKEN: PRs created with GITHUB_TOKEN do not trigger other workflows. Since we run validation inline (step 7), this is acceptable. If CI checks on the PR are needed in the future, a Personal Access Token or GitHub App token can be used instead.

### Milestone 5: Integration testing and hardening

This milestone validates the end-to-end pipeline and adds robustness.

1. Write a Vitest test file at `scripts/auto-character/sync.test.ts` that:
   - Tests the transform functions with mock datamine data.
   - Verifies that transforming known character data produces the expected CSV rows.
   - Verifies that transforming known commission data produces the expected CSV rows.
   - Tests edge cases: unreleased characters (name "???"), variant characters (ラール（聖夜）), new tags not in existing tags.src.json.

2. Run the full pipeline locally with `--dry-run` and verify zero discrepancies against the current CSV data.

3. Run the full pipeline locally without `--dry-run` (on a temporary branch) to verify:
   - CSV files are regenerated correctly and pass `npm run validate:data`.
   - Icons are downloaded and are valid 164x164 PNGs.
   - The summary JSON is correct.

4. Test the GitHub Actions workflow via `workflow_dispatch` and verify a PR is created correctly targeting `develop`.

5. Add assertions in the sync script for structural invariants:
   - Character count in CharacterDes.json must be >= 25 (scraper breakage detection).
   - Agent.json commission count must be >= 30.
   - All tag IDs referenced in CharacterDes must exist in CharacterTag.
   - All tag IDs in Agent Tags/ExtraTags must exist in CharacterTag.
   - Generated CSV must pass validation when run through build:data + validate:data.


## Concrete Steps

### Step 0: Install new dependencies

    cd /path/to/ss-assist
    npm install --save-dev cheerio sharp @types/cheerio

### Step 1: Create directory structure

    mkdir -p scripts/auto-character

### Step 2: Create files in order

Create each file as described in the milestones above:
1. `scripts/auto-character/types.ts`
2. `scripts/auto-character/config.ts`
3. `scripts/auto-character/fetch.ts`
4. `scripts/auto-character/csv-io.ts`
5. `scripts/auto-character/transform.ts`
6. `scripts/auto-character/sync.ts`
7. `scripts/auto-character/sync.test.ts`
8. `.github/workflows/auto-character.yml`

### Step 3: Add npm script

In `package.json`, add to the `scripts` object:

    "sync:data": "tsx scripts/auto-character/sync.ts"

### Step 4: Run prototype validation

    npx tsx scripts/auto-character/prototype.ts

Expected: All 29 characters and 36 commissions match existing CSV data.

### Step 5: Run sync in dry-run mode

    npm run sync:data -- --dry-run

Expected output: Lists all characters and commissions with status "unchanged" or "new". Zero discrepancies for existing data.

### Step 6: Run full sync (on a test branch)

    git checkout -b test/auto-sync
    npm run sync:data
    npm run build:data
    npm run validate:data

Expected: All validations pass. Any new characters have icons downloaded.

### Step 7: Run tests

    npm test -- scripts/auto-character/sync.test.ts

Expected: All tests pass.

### Step 8: Test GitHub Actions workflow

Push the workflow file to develop, then trigger via the GitHub Actions UI:

    Actions tab → "Auto-detect new characters" → Run workflow → Branch: develop

Expected: Workflow runs successfully. If there are differences, a PR is created. If not, workflow exits cleanly.


## Validation and Acceptance

The pipeline is validated at multiple levels:

1. **Unit tests**: `npm test -- scripts/auto-character/sync.test.ts` — Tests transform logic with mock data. All tests must pass.

2. **Data integrity**: `npm run sync:data -- --dry-run` — Running the sync in dry-run mode must show zero discrepancies between generated data and existing CSV data for all 29 characters and 36 commissions.

3. **Pipeline integrity**: After running `npm run sync:data` (non-dry-run), running `npm run build:data && npm run validate:data` must succeed. This proves the generated CSV is compatible with the existing data pipeline.

4. **Visual verification**: Icon images at `public/assets/characters/` must be 164x164 PNG files that visually depict the correct character.

5. **Workflow verification**: Triggering the GitHub Actions workflow via `workflow_dispatch` must either create a PR (if changes exist) or exit cleanly (if no changes). The PR must target `develop`, contain the CSV changes, and include a review checklist.

6. **Regression**: The full application test suite (`npm test`) must continue to pass after all changes.


## Idempotence and Recovery

The sync script is designed to be idempotent. Running it multiple times with no changes to StellaSoraData produces no modifications to local files. The comparison logic diffs generated data against existing CSV content and only writes when differences are found.

If the sync script fails mid-execution (e.g., network error fetching StellaSoraData), no files are modified because the script collects all data first, then writes all files atomically at the end (a future enhancement could use temp files + rename, but for now the script simply crashes before writing if any fetch fails).

If the GitHub Actions workflow fails, it can be re-triggered via `workflow_dispatch`. Since `peter-evans/create-pull-request` is idempotent, re-running the workflow updates the existing auto-PR branch rather than creating duplicates.

If a bad PR is merged, recovery is standard git: revert the merge commit on develop.


## Interfaces and Dependencies

**New npm devDependencies:**
- `cheerio` (^1.0.0) — HTML parsing for wikiru icon extraction. jQuery-like API, well-maintained, used by many Node.js scrapers.
- `sharp` (^0.33.0) — High-performance image processing for icon resizing to 164x164 PNG. Preferred over canvas/jimp for quality and speed.
- `@types/cheerio` — TypeScript types for cheerio.

**External services accessed:**
- `raw.githubusercontent.com` — For fetching StellaSoraData JSON files. No authentication needed (public repo).
- `stellasora.wikiru.jp` — For fetching character icon images. No authentication needed. Rate limit: one request per 2 seconds (politeness delay).

**Key TypeScript interfaces** (in `scripts/auto-character/types.ts`):

    interface DatamineCharacter {
      Id: number;
      Grade: number;    // 1=★5, 2=★4
      Class: number;    // 1=Attacker, 2=Balancer, 3=Supporter
      EET: number;      // 1=水, 2=火, 3=地, 4=風, 5=光, 6=闇
      Visible: boolean;
      Available: boolean;
      Name: string;     // Localization key
    }

    interface DatamineCharacterDes {
      Id: number;
      Tag: [number, number, number];  // [roleTagId, styleTagId, factionTagId]
      Force: number;
    }

    interface DatamineCharacterTag {
      Id: number;
      Title: string;    // Localization key
      TagType: number;  // 1=role, 2=style, 3=faction
    }

    interface DatamineAgent {
      Id: number;
      Tab: number;
      Name: string;
      Level: number;
      MemberLimit: number;
      Tags: number[];
      ExtraTags: number[];
      Quality: number;
      Time1: number;  // minutes
      Time2: number;
      Time3: number;
      Time4: number;
      RewardPreview1: string;  // JSON array string
      BonusPreview1: string;
      RewardPreview2: string;
      BonusPreview2: string;
      RewardPreview3: string;
      BonusPreview3: string;
      RewardPreview4: string;
      BonusPreview4: string;
    }

    interface SyncResult {
      newCharacters: Array<{ id: string; name_ja: string }>;
      newCommissions: Array<{ id: string; name_ja: string }>;
      updatedTags: string[];
      warnings: string[];
      hasChanges: boolean;
    }

**Key exported functions:**

In `scripts/auto-character/fetch.ts`:

    export async function fetchAllCharacterData(): Promise<CharacterDataBundle>
    export async function fetchAllCommissionData(): Promise<CommissionDataBundle>

In `scripts/auto-character/transform.ts`:

    export function transformCharacters(bundle: CharacterDataBundle, existingRows: CsvRow[]): TransformResult
    export function transformCommissions(bundle: CommissionDataBundle, existingRows: CsvRow[]): TransformResult

In `scripts/auto-character/csv-io.ts`:

    export function readCsv(filePath: string): CsvRow[]
    export function writeCsv(filePath: string, rows: CsvRow[], columns: string[]): void

In `scripts/auto-character/sync.ts`:

    // Main entry point, invoked via: npx tsx scripts/auto-character/sync.ts
    // Exit codes: 0 = changes written, 2 = no changes
