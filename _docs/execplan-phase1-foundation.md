# Phase 1: Foundation & Data Layer - ExecPlan

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `/Users/ghensk/Developer/ss-assist/_docs/PLANS.md` which is checked into the repository.


## Purpose / Big Picture

After completing this phase, the Stella Sora Request Assistant will have a complete data pipeline that converts human-editable CSV files (containing character and commission data in Japanese) into optimized JSON files that the React application can load. A developer will be able to add new characters or commissions by editing simple CSV files, run a single command, and see the generated JSON files appear with properly normalized tag IDs and multi-language support. The validation system will catch errors like missing tags or invalid references before deployment.

The demonstrable outcome is: Run `npm run build:data` and observe that `data/characters.json`, `data/commissions.json`, and `data/tags.json` are generated from source files with all Japanese tag names converted to stable language-neutral IDs (like "role-001", "style-002"), while preserving the original Japanese labels and Chinese translations for display purposes.


## Progress

- [x] Milestone 1: Define TypeScript type system
  - [x] Create complete type definitions in `src/types/index.ts`
  - [x] Verify types compile without errors

- [x] Milestone 2: Build JSON validation system
  - [x] Install validation libraries (ajv, ajv-formats, tsx)
  - [x] Create `scripts/validate-data.ts` with JSON schemas
  - [x] Test validation with valid and invalid data
  - [x] Integrate with npm scripts

- [x] Milestone 3: Implement CSV to JSON converter
  - [x] Install CSV parsing library
  - [x] Create `scripts/csv-to-json.ts` for data pipeline
  - [x] Handle tags.src.json → tags.json conversion (validate IDs)
  - [x] Handle characters.csv → characters.json conversion
  - [x] Handle commissions.csv → commissions.json conversion
  - [x] Merge translations from i18n files

- [x] Milestone 4: Create sample dataset
  - [x] Populate `data/tags.src.json` with game tags (with manual IDs: role-001, style-002, etc.)
  - [x] Create `data-sources/characters.csv` with sample characters
  - [x] Create `data-sources/commissions.csv` with sample commissions
  - [x] Add Chinese translations to `i18n/tags.zh-Hans.json` and `i18n/tags.zh-Hant.json`
  - [x] Run full pipeline and verify output


## Surprises & Discoveries

### CSV Data Entry Format
During planning, we decided to keep Japanese labels in CSV files (characters.csv and missions.csv) rather than requiring manual ID entry. This makes data maintenance easier for the technical maintainer who is fluent in Japanese. The csv-to-json converter creates a reverse mapping (Japanese label → ID) from tags.json to translate these labels during conversion.

### ES Module Compatibility in Validation Script
The project uses `"type": "module"` in package.json, requiring ES module syntax throughout. The initial validation script used CommonJS `require.main === module` pattern for detecting direct execution. This was replaced with ES module pattern: `import.meta.url === `file://${process.argv[1]}`` to properly detect when the script is run directly via npm scripts.

### Reverse Mapping Strategy for CSV Conversion
The CSV to JSON converter creates a reverse mapping (Map<string, string>) from Japanese labels to tag IDs during tag conversion. This mapping is keyed as `"category:label"` (e.g., `"role:アタッカー"` → `"role-002"`) to handle cases where the same Japanese word might appear in different categories with different meanings. The characters and missions converters use this mapping to translate human-readable Japanese labels in CSV files into language-neutral IDs in the output JSON.

### File Encoding Challenges (2025-11-03)
When populating sample data files during Milestone 4, Claude Code's Write tool created files with incorrect character encoding (binary/Shift-JIS instead of UTF-8), causing JSON parsing errors and linter warnings. Attempts to auto-detect and convert the encoding using iconv and Python failed across multiple Japanese encodings (Shift-JIS, CP932, EUC-JP, ISO-2022-JP).

**Solution:** Used bash heredoc (cat > file << 'EOF') to create files directly in the terminal with proper UTF-8 encoding. This approach bypasses the Write tool's encoding issues and ensures all Japanese, Simplified Chinese, and Traditional Chinese characters are correctly encoded as UTF-8. All data files now validate correctly with `file -I` showing `charset=utf-8`.

**Best Practice:** For multi-language data files containing CJK characters, prefer bash heredoc or direct terminal input over programmatic file writing to ensure correct UTF-8 encoding.

### Google Sheets CSV Naming Convention (2025-11-04)
After completing the initial implementation, we discovered that Google Sheets automatically adds a prefix when downloading CSV files (format: "spreadsheet-name - sheet-name.csv"). To streamline the workflow and avoid manual file renaming, we adopted this convention.

**Decision:** Renamed CSV files from `characters.csv` and `missions.csv` to `stellasora - characters.csv` and `stellasora - missions.csv`. Updated the conversion script (`scripts/csv-to-json.ts`) to expect files with this prefix.

**Benefit:** Data maintainers can now download CSV exports from Google Sheets and drop them directly into `data-sources/` without renaming. This reduces friction in the data update workflow and prevents errors from forgetting to rename files.

### Commission Duration Options Discovery (2025-11-05)
After populating the commissions CSV with real game data, we discovered that commissions support multiple time duration options (not just fixed rewards). Each commission allows players to choose from 2-4 different time durations, with rewards scaling accordingly.

**Details:**
- Most commissions (m-001 to m-027): 4 duration options (4h, 8h, 12h, 20h)
- Skill-based commissions (m-028 to m-036): 2 duration options (12h, 20h)
- Rewards scale with duration and support variable amounts (ranges like "1~2 items")

**Solution:** Extended the data model and CSV structure to support multiple durations per commission. Each duration has its own hours, rewards, and bonusRewards. The CSV uses numbered columns (`duration_1_hours`, `duration_1_rewards`, `duration_1_bonus_rewards`, etc.) for up to 4 durations. Empty columns indicate fewer duration options.

**Impact:**
- TypeScript types: Added `CommissionDuration` interface and `RewardAmount` for min-max ranges
- CSV converter: Added `parseAmount()` and `parseRewards()` functions to handle range notation
- Validation: Added schemas for duration arrays and reward amount ranges
- Reward model simplified: Changed from discriminated union to single interface with `itemId` + `amount`


## Decision Log

### 2025-11-02: Tag ID Strategy Change

**Decision:** Use sequential category-based IDs (e.g., "role-001", "style-002") instead of romanized English IDs (e.g., "attacker", "collector").

**Rationale:**
1. Kuroshiro library only produces romaji (e.g., "atakkā") not meaningful English translations
2. Creating unofficial English names could conflict with future official English localization from the game
3. Sequential IDs are simpler, language-neutral, and more maintainable
4. The data maintainer is technical and comfortable with manual ID assignment

**Impact:**
- Removed Milestone 2 (Slug Generation) entirely
- No need for kuroshiro/kuromoji libraries
- tags.src.json format changed from simple arrays to objects with manual IDs:
  ```json
  {
    "role": [
      { "id": "role-001", "ja": "アタッカー" },
      { "id": "role-002", "ja": "バランサー" }
    ]
  }
  ```
- CSV converter now validates that IDs follow the pattern rather than generating them
- Reduced overall complexity and external dependencies

### 2025-11-05: Commission Duration Support

**Decision:** Implement multiple duration options per commission with variable reward ranges instead of single fixed rewards.

**Rationale:**
1. Game mechanics allow players to choose commission duration (4h/8h/12h/20h for most, 12h/20h for skill commissions)
2. Rewards scale with duration, with some items having variable amounts
3. Users need to compare duration options when optimizing commission assignments
4. CSV structure should remain flat for easy editing in spreadsheet tools

**Impact:**
- Changed Commission interface from `rewards: Reward[]` to `durations: CommissionDuration[]`
- Added `RewardAmount` interface with min/max for range support (e.g., "1~2 items")
- Simplified Reward from discriminated union to single interface: `{ itemId, amount, category? }`
- CSV format expanded from 11 columns to 21 columns (20 duration-related columns)
- Converter supports parsing range notation (`1~2`) and gracefully handles 2-4 durations per commission
- Validation enforces 1-4 durations per commission with proper schema checks


## Outcomes & Retrospective

**Initial Completion Date:** 2025-11-03
**Extended Features:** 2025-11-05 (Commission Duration Support)

**Status:** ✅ All milestones completed successfully + commission duration feature extension

### What We Achieved

Phase 1 delivered a complete, working data pipeline for the Stella Sora Request Assistant:

1. **Type System (Milestone 1):** Complete TypeScript type definitions establish a solid contract between data and application code. Types cover all data structures including multi-language strings, tag dictionaries, characters, commissions, conditions, and rewards.

2. **Validation System (Milestone 2):** JSON Schema validation using ajv ensures data integrity. The validator checks schema compliance, ID format patterns (category-NNN), and referential integrity across files. Running `npm run validate:data` confirms all data is correct before deployment.

3. **Data Pipeline (Milestone 3):** The CSV-to-JSON converter successfully transforms human-editable source files into optimized JSON. Key features include:
   - Tag ID validation (enforces category-NNN pattern)
   - Japanese label → ID translation via reverse mapping
   - Multi-language translation merging from i18n files
   - Robust error handling with clear error messages
   - Graceful handling of missing/empty files

4. **Sample Dataset (Milestone 4):** Populated with real game data:
   - 32 tags across 5 categories (role, style, faction, element, rarity)
   - 26 characters with multi-language names and complete tag assignments
   - 36 commissions with varying complexity, conditions, and multiple duration options
   - 32 Simplified Chinese translations with idiomatic expressions

5. **Commission Duration Feature (Extension):** Added support for multiple time duration options per commission:
   - Type system extended with `CommissionDuration` and `RewardAmount` interfaces
   - CSV converter parses duration columns and reward range notation (e.g., "1~2")
   - Validation schemas updated to handle 1-4 duration options per commission
   - 27 standard commissions with 4 durations (4h/8h/12h/20h)
   - 9 skill-based commissions with 2 durations (12h/20h)
   - All rewards support variable amounts via min-max ranges

### Demonstrable Outcomes

The pipeline works end-to-end:

```bash
$ npm run build:data
✓ Validated 32 tag IDs across 5 categories
✓ Processed 26 characters
✓ Processed 36 commissions
✅ Data conversion completed successfully!

$ npm run validate:data
✓ data/tags.json is valid
✓ data/characters.json is valid
✓ data/commissions.json is valid
✓ All tag references are valid
✅ All data files are valid!
```

All generated files are properly UTF-8 encoded and contain correctly transformed data with Japanese labels converted to language-neutral IDs (role-001, style-002, etc.).

### Challenges & Solutions

**Encoding Issues:** The primary challenge was ensuring UTF-8 encoding for CJK characters. The Write tool initially created files with incorrect encoding. Solution: Used bash heredoc for reliable UTF-8 encoding.

**CSV Column Validation:** During testing, discovered a bug where a role tag appeared in a style column. The converter's error message clearly identified the issue, demonstrating the robustness of error handling.

### What Worked Well

- **Manual ID Strategy:** Sequential IDs (role-001, style-002) proved simple and maintainable
- **Japanese-first Workflow:** Keeping CSV data in Japanese and auto-converting to IDs works smoothly
- **Reverse Mapping:** Category-prefixed keys prevent collisions between categories
- **Error Messages:** Clear, actionable error messages made debugging straightforward
- **Validation Early:** Running validation immediately after conversion catches issues fast

### Lessons Learned

1. **File Encoding Matters:** For multi-language projects with CJK characters, explicitly verify encoding (use `file -I`) and prefer bash heredoc for reliability
2. **Validate Early, Validate Often:** The validation script caught multiple issues during development
3. **Clear Error Messages:** Investing time in error messages pays off during data maintenance
4. **Test with Real Data:** Sample data revealed edge cases not apparent in minimal examples
5. **Iterate on Design:** Starting with simplified assumptions (fixed commission rewards) and extending when real game mechanics emerge (duration options) is better than over-engineering upfront. The clean architecture made adding duration support straightforward.

### Next Steps

Phase 1 foundation is complete. The data pipeline is production-ready. Next phases will build:
- Phase 2: React UI components (character roster, commission picker, results view)
- Phase 3: Combination search algorithm with bitmask optimization
- Phase 4: Training priority scoring system
- Phase 5: GitHub Pages deployment and CI/CD automation

The data layer provides a solid foundation for UI development.


## Context and Orientation

This is a serverless web application for the game Stella Sora that helps players optimize character combinations for commissions. The application is built with React, TypeScript, and Vite, and will be deployed to GitHub Pages.

The project uses a data pipeline approach where the technical maintainer can edit JSON and CSV files with character and commission data, and a build script converts these into optimized JSON files for the web app. All internal logic uses stable language-neutral IDs (like "role-001", "style-002") while the UI displays localized text in Japanese, Simplified Chinese, or Traditional Chinese.

Key files and directories:
- `src/types/index.ts` - TypeScript type definitions (✓ completed)
- `scripts/csv-to-json.ts` - Main data conversion pipeline (✓ completed)
- `scripts/validate-data.ts` - JSON schema validation (✓ completed)
- `data/tags.src.json` - Human-editable tag dictionary with manual IDs (✓ completed)
- `data-sources/` - Human-editable CSV files (✓ completed)
- `data/` - Auto-generated JSON files (✓ completed)
- `i18n/` - Translation files for Chinese languages (✓ completed)

The tech stack includes Node.js 18+, TypeScript 5, and the following npm packages: Vite for building, Vitest for testing, csv-parse for CSV parsing, ajv and ajv-formats for JSON validation, tsx for running TypeScript scripts, and standard TypeScript utilities.


## Plan of Work

The work proceeds in four milestones, each building on the previous:

**Milestone 1: Type Definitions** (✓ COMPLETED) - We established the TypeScript type system that defines the shape of all data structures. This includes types for categories (role, style, faction, element, rarity), characters with their tags, commissions with conditions and rewards, and the multi-language string format. These types serve as the contract between the data pipeline and the React application.

**Milestone 2: Validation System** (✓ COMPLETED) - We implemented JSON Schema validation to catch data errors before deployment. Schemas define required fields, allowed value types, multi-language string structure, ID format validation (category-NNN pattern), and referential integrity (ensuring all tag IDs referenced by characters and commissions exist in the tag dictionary). The validation runs automatically in CI/CD and can be run locally with npm run validate:data. We also fixed ES module compatibility by replacing CommonJS patterns with ES module syntax.

**Milestone 3: Data Conversion Pipeline** (✓ COMPLETED) - We built the main converter script that orchestrates the entire data transformation. It reads tags.src.json (with manual IDs like "role-001"), validates ID format, merges Chinese translations from i18n files, outputs tags.json with all languages. Then it reads stellasora - characters.csv and stellasora - commissions.csv, creates a reverse mapping (Japanese label → ID), replaces Japanese tag labels with their corresponding IDs, and outputs characters.json and commissions.json. The script includes robust error handling for missing tags, invalid ID patterns, duplicate labels, and malformed CSV rows.

**Milestone 4: Sample Dataset** - We populate source files with real game data to validate the entire pipeline. This includes approximately 15 characters (Kohaku, Minerva, and others from the design document), 6 commissions with varying conditions, complete tag dictionary with 5 categories (each tag assigned a sequential ID like role-001, role-002), and Chinese translations for common tags. After running the pipeline, we verify the output JSON files are correctly formatted and can be loaded by the application.


## Concrete Steps

All commands are run from the repository root directory `/Users/ghensk/Developer/ss-assist` unless otherwise specified.


### Milestone 1: Define TypeScript Type System

**Step 1.1:** Open `src/types/index.ts` and add the complete type definitions. The file will define:

- Category type as a union of string literals for tag categories
- TagDict interface for the tag dictionary structure with multi-language support
- Character interface with id, multi-language name, icon path, and tags by category
- Condition interface for mission requirements with category and anyOf arrays
- Reward discriminated union types for gold, items, and experience points
- Mission interface with conditions, rewards, and required level
- LocalStorage data structure types

After editing, run:

    npm run type-check

Expected output:

    > type-check
    > tsc --noEmit

    (no output means success)

If you see TypeScript errors, review the type definitions and fix any syntax issues.


**Step 1.2:** (✓ COMPLETED) Verify types compile without errors.


### Milestone 2: Build JSON Validation System

**Step 2.1:** Install JSON schema validation libraries and tsx:

    npm install ajv ajv-formats tsx

Expected output shows packages installed.


**Step 2.2:** Open `scripts/validate-data.ts` and implement validation schemas. Define JSON schemas for:

**Tags Schema** - Object with category keys (role, style, faction, element, rarity), each containing an array of objects with:
- id (required string)
- ja (required string, Japanese label)
- zh-Hans (optional string, Simplified Chinese)
- zh-Hant (optional string, Traditional Chinese)

**Characters Schema** - Array of objects with:
- id (required string)
- name (required object with ja, optional zh-Hans, zh-Hant)
- icon (required string, path to image)
- tags (required object, keys are categories, values are arrays of tag ID strings)

**Commissions Schema** - Array of objects with:
- id (required string)
- name (required object, multi-language)
- requiredLevel (required number, 1-90)
- baseConditions (required array of condition objects)
- bonusConditions (optional array of condition objects)
- rewards (required array of reward objects)

Condition object has category (string) and anyOf (array of strings).

Reward object has type discriminator (gold/item/exp) and type-specific fields.

Implement function:

    validateDataFiles(): Promise<{ valid: boolean; errors: string[] }>

This function should load data/tags.json, data/characters.json, and data/missions.json, validate each against its schema, and perform cross-validation (all tag IDs referenced in characters and missions must exist in tags).


**Step 2.3:** Add npm script to package.json scripts section:

    "validate:data": "tsx scripts/validate-data.ts"

Note: tsx was installed in Step 2.1.

Run validation (it will fail since files are empty):

    npm run validate:data

Expected output:

    Validation errors:
    - data/tags.json: (specific error about empty/invalid JSON)
    - data/characters.json: (specific error)
    - data/commissions.json: (specific error)

This is expected at this stage. We will create valid files in later milestones.

**(✓ COMPLETED 2025-11-03)** - All validation schemas implemented, cross-validation working, ES module compatibility fixed. Script properly validates tag ID format, multi-language strings, and referential integrity.


### Milestone 3: Implement CSV to JSON Converter

**Step 3.1:** Install CSV parsing library:

    npm install csv-parse

Expected output shows package installed.


**Step 3.2:** Open `scripts/csv-to-json.ts` and implement the conversion pipeline. The script should have these main functions:

**convertTags()** - Reads data/tags.src.json which has this format:

    {
      "role": [
        { "id": "role-001", "ja": "アタッカー" },
        { "id": "role-002", "ja": "バランサー" }
      ],
      "style": [
        { "id": "style-001", "ja": "収集家" },
        { "id": "style-002", "ja": "しっかり者" }
      ],
      ...
    }

For each category and tag entry:
1. Validate that ID follows pattern: `{category}-\d{3}` (e.g., "role-001")
2. Look up translations in i18n/tags.zh-Hans.json and i18n/tags.zh-Hant.json using the Japanese label as key
3. Add zh-Hans and zh-Hant fields if translations exist
4. Output to data/tags.json in same format with translations merged

**convertCharacters()** - Reads `data-sources/stellasora - characters.csv` with format:

    id,name_ja,name_zh-Hans,name_zh-Hant,icon,role,style,faction,element,rarity
    kohaku,コハク,琥珀,琥珀,assets/characters/kohaku.png,アタッカー,収集家,空白旅団,水,5

For each row:
1. Build name object from name_ja, name_zh-Hans, name_zh-Hant columns
2. For each tag column (role, style, faction, element, rarity):
   - Split by | delimiter to support multiple tags
   - Look up each Japanese label in tags.json to find its ID (using reverse mapping)
   - Error if label not found
   - Build tags object mapping category to array of IDs
3. Output to data/characters.json

**convertMissions()** - Reads data-sources/missions.csv with format:

    id,name_ja,name_zh-Hans,requiredLevel,base_role,base_style,bonus_role,rewards
    m001,旧遺跡の調査,旧遗迹调查,50,アタッカー|バランサー,収集家,アタッカー,gold:12000

For each row:
1. Build name object
2. Parse base_* columns into baseConditions array
3. Parse bonus_* columns into bonusConditions array
4. Look up each Japanese label in tags.json to find its ID (using reverse mapping)
5. Parse rewards column (format: type:amount or type:id:amount)
6. Output to data/missions.json

**Main function** - Calls convertTags(), then convertCharacters(), then convertMissions() in order (since later steps depend on tags.json existing).


**Step 3.3:** Add npm script:

    "build:data": "tsx scripts/csv-to-json.ts"

Try running it (will fail since source files are empty):

    npm run build:data

Expected output:

    Error: data/tags.src.json not found or empty
    (or similar)

**(✓ COMPLETED 2025-11-03)** - Complete CSV to JSON conversion pipeline implemented with:
- Tag conversion with ID format validation (category-NNN pattern)
- Character conversion with Japanese label → ID mapping
- Mission conversion with condition and reward parsing
- Translation merging from i18n files
- Robust error handling and clear error messages
- Graceful handling of missing CSV files


### Milestone 4: Create Sample Dataset

**Step 4.1:** Open `data/tags.src.json` and add complete tag dictionary with manual IDs:

    {
      "role": [
        { "id": "role-001", "ja": "バランサー" },
        { "id": "role-002", "ja": "アタッカー" },
        { "id": "role-003", "ja": "サポーター" }
      ],
      "style": [
        { "id": "style-001", "ja": "冒険家" },
        { "id": "style-002", "ja": "独創性" },
        { "id": "style-003", "ja": "しっかり者" },
        { "id": "style-004", "ja": "収集家" },
        { "id": "style-005", "ja": "知的好奇心" }
      ],
      "faction": [
        { "id": "faction-001", "ja": "雲笈文化" },
        { "id": "faction-002", "ja": "ムーナワークス" },
        { "id": "faction-003", "ja": "レッドアイズ" },
        { "id": "faction-004", "ja": "恩恵意思" },
        { "id": "faction-005", "ja": "空白旅団" },
        { "id": "faction-006", "ja": "花咲旅団" },
        { "id": "faction-007", "ja": "帝国護衛隊" },
        { "id": "faction-008", "ja": "ウィンドアッシュ" },
        { "id": "faction-009", "ja": "ヨロズ配達" },
        { "id": "faction-010", "ja": "白沢管理局" },
        { "id": "faction-011", "ja": "アグリ・ユニオン" },
        { "id": "faction-012", "ja": "その他" },
        { "id": "faction-013", "ja": "地理協会" },
        { "id": "faction-014", "ja": "谷風家政" },
        { "id": "faction-015", "ja": "鳳凰炒飯" },
        { "id": "faction-016", "ja": "劇団白猫" }
      ],
      "element": [
        { "id": "element-001", "ja": "水" },
        { "id": "element-002", "ja": "火" },
        { "id": "element-003", "ja": "地" },
        { "id": "element-004", "ja": "風" },
        { "id": "element-005", "ja": "光" },
        { "id": "element-006", "ja": "闇" }
      ],
      "rarity": [
        { "id": "rarity-005", "ja": "5" },
        { "id": "rarity-004", "ja": "4" }
      ]
    }

Save the file.


**Step 5.2:** Create `data-sources/characters.csv` with header row and at least 10-15 characters:

    id,name_ja,name_zh-Hans,name_zh-Hant,role,style,faction,element,rarity,icon
    kohaku,コハク,琥珀,琥珀,アタッカー,収集家,空白旅団,水,5,assets/characters/kohaku.png
    minerva,ミネルバ,密涅瓦,密涅瓦,バランサー,しっかり者,ウィンドアッシュ,風,5,assets/characters/minerva.png
    (add 8-13 more characters with varied tags)

Save the file.


**Step 5.3:** Create `data-sources/missions.csv` with header row and 4-6 missions:

    id,name_ja,name_zh-Hans,requiredLevel,base_role,base_style,base_faction,bonus_role,bonus_style,rewards
    m001,旧遺跡の調査,旧遗迹调查,50,アタッカー|バランサー,収集家,空白旅団,,,gold:12000|item:mat_core:2
    m002,素材収集依頼,素材收集,30,,収集家|しっかり者,,アタッカー,,gold:8000
    (add 2-4 more missions)

Note: Empty columns mean no condition for that category.

Save the file.


**Step 5.4:** Open `i18n/tags.zh-Hans.json` and add Simplified Chinese translations:

    {
      "role": {
        "アタッカー": "输出",
        "バランサー": "均衡",
        "サポーター": "辅助"
      },
      "style": {
        "収集家": "收集者",
        "しっかり者": "稳重"
      }
    }

(Add more translations as needed)

Save the file.


**Step 5.5:** Open `i18n/tags.zh-Hant.json` and add Traditional Chinese translations (similar structure to zh-Hans, with traditional characters).

Save the file.


**Step 5.6:** Run the complete pipeline:

    npm run build:data

Expected output:

    Converting tags...
    Validated 30+ tag IDs across 5 categories
    Merged translations from i18n files
    Wrote data/tags.json

    Converting characters...
    Processed 15 characters
    Wrote data/characters.json

    Converting missions...
    Processed 6 missions
    Wrote data/missions.json

    Data build complete!

If there are errors about missing tag references, fix the CSV files and re-run.


**Step 5.7:** Validate the generated data:

    npm run validate:data

Expected output:

    Validating data/tags.json... ✓
    Validating data/characters.json... ✓
    Validating data/missions.json... ✓
    Cross-validation: ✓
    All data files are valid!

If validation fails, review the error messages, fix the source data or conversion logic, and re-run the pipeline.


**Step 5.8:** Inspect the generated files manually:

    cat data/tags.json | head -20

You should see properly formatted JSON with tag objects containing id, ja, and optionally zh-Hans and zh-Hant fields.

    cat data/characters.json | head -30

You should see character objects with tag arrays using language-neutral IDs like role-001, style-002 (not Japanese labels).

    cat data/missions.json | head -30

You should see mission objects with baseConditions and bonusConditions arrays using tag IDs.


## Validation and Acceptance

The Phase 1 foundation is complete when:

1. **Type checking passes**: Running `npm run type-check` produces no errors

2. **Data pipeline executes successfully**: Running `npm run build:data` reads CSV source files and generates three JSON files without errors

3. **Validation passes**: Running `npm run validate:data` confirms all generated JSON files match their schemas and have valid tag references

4. **Manual inspection confirms correct transformation**: Opening `data/tags.json` shows tag objects with manually assigned language-neutral IDs (role-001, style-002, etc.) and multi-language labels. Opening `data/characters.json` shows characters with tag references using IDs. Opening `data/missions.json` shows missions with properly formatted conditions and rewards

5. **ID format validation works**: The pipeline validates that all tag IDs follow the category-NNN pattern and rejects malformed IDs

6. **Error handling works**: Intentionally breaking a CSV file (adding a non-existent tag reference) and running the pipeline produces a clear error message identifying the problem

To demonstrate the system works end-to-end:

Start with empty or minimal data files, add one character and one mission via CSV, run build:data, observe that JSON files are created with correctly normalized data, then run validate:data to confirm the output is schema-compliant. This proves the entire pipeline from human-editable source to application-ready JSON is functional.


## Idempotence and Recovery

All steps in this ExecPlan are idempotent. You can run them multiple times safely:

- Installing npm packages: npm install checks existing installations and only adds missing packages
- Creating type definitions: editing TypeScript files and re-running type-check is safe
- Running build:data: the script overwrites output files, so running it multiple times with the same input produces the same output
- Running validate:data: validation is read-only and does not modify files

If a step fails partway through:

- If npm install fails due to network issues, simply retry the command
- If build:data fails on one conversion step, fix the source data or script and re-run; the script will regenerate all output files
- If validation fails, the error messages indicate which file and which field has an issue; fix the source and re-run the pipeline

To completely reset and start fresh, delete the generated files:

    rm data/tags.json data/characters.json data/missions.json

Then re-run the pipeline. The source files in data-sources/ and data/tags.src.json are the source of truth and should not be deleted unless you want to start the dataset over.


## Artifacts and Notes

### Example Type Definitions (src/types/index.ts excerpt)

    export type Category = "role" | "style" | "faction" | "element" | "rarity";

    export interface MultiLangString {
      ja: string;
      "zh-Hans"?: string;
      "zh-Hant"?: string;
    }

    export interface TagEntry {
      id: string;
      ja: string;
      "zh-Hans"?: string;
      "zh-Hant"?: string;
    }

    export interface Character {
      id: string;
      name: MultiLangString;
      icon: string;
      tags: Partial<Record<Category, string[]>>;
    }

    export interface Condition {
      category: Category;
      anyOf: string[];
    }

    export type Reward =
      | { type: "gold"; amount: number }
      | { type: "item"; id: string; amount: number }
      | { type: "exp"; amount: number };

    export interface Mission {
      id: string;
      name: MultiLangString;
      requiredLevel: number;
      baseConditions: Condition[];
      bonusConditions?: Condition[];
      rewards: Reward[];
    }


### Example Validation Error Output

    npm run validate:data

    Validating data/tags.json...
    Error: Invalid schema - missing required field "ja" in role[2]

    Validating data/characters.json...
    Error: Tag reference not found - character "kohaku" references tag ID "unknown_role" which does not exist in tags.json

    Validation failed with 2 errors.


### Example Successful Pipeline Run

    npm run build:data

    [1/3] Converting tags from data/tags.src.json...
      Generated 18 unique slugs across 5 categories
      Merged 12 zh-Hans translations
      Merged 10 zh-Hant translations
      Wrote data/tags.json (2.1 KB)

    [2/3] Converting characters from data-sources/characters.csv...
      Processed 15 characters
      Resolved 47 tag references
      Wrote data/characters.json (5.3 KB)

    [3/3] Converting missions from data-sources/missions.csv...
      Processed 6 missions
      Resolved 18 condition references
      Wrote data/missions.json (3.8 KB)

    ✓ Data build completed successfully in 142ms


## Interfaces and Dependencies

### scripts/validate-data.ts exports

    interface ValidationResult {
      valid: boolean;
      errors: string[];
    }

    export async function validateDataFiles(): Promise<ValidationResult>;

Loads and validates all three data JSON files. Returns valid: true if all files pass schema and cross-validation checks, otherwise returns valid: false with an array of human-readable error messages.


### scripts/csv-to-json.ts exports

This is primarily a CLI script (run via npm run build:data) and does not export functions, but internally it has:

    async function convertTags(): Promise<void>
    async function convertCharacters(): Promise<void>
    async function convertMissions(): Promise<void>
    async function main(): Promise<void>

The main function orchestrates the pipeline. Each convert function reads source files, transforms data, and writes output JSON. If any step encounters an error (missing file, invalid tag reference, malformed CSV), it should log a clear error message and exit with non-zero status.


### Package dependencies added

    csv-parse: CSV parsing with support for headers and type coercion
    ajv: JSON Schema validator
    ajv-formats: Additional format validators for ajv (email, uri, etc.)
    tsx: TypeScript execution tool for running scripts without pre-compilation

All dependencies are added via npm install commands in the concrete steps.


### File paths and content

All paths are relative to repository root `/Users/ghensk/Developer/ss-assist`:

- Source files (human-editable):
  - `data/tags.src.json` - Tag labels in Japanese only
  - `data-sources/stellasora - characters.csv` - Character data with multi-language names
  - `data-sources/stellasora - missions.csv` - Mission data with conditions and rewards
  - `i18n/tags.zh-Hans.json` - Simplified Chinese translations
  - `i18n/tags.zh-Hant.json` - Traditional Chinese translations

- Generated files (do not edit manually):
  - `data/tags.json` - Tag dictionary with IDs and all languages
  - `data/characters.json` - Character list with tag ID references
  - `data/missions.json` - Mission list with normalized conditions

- Implementation files:
  - `src/types/index.ts` - TypeScript type definitions
  - `scripts/validate-data.ts` - Validation logic
  - `scripts/csv-to-json.ts` - Main data pipeline

- Test files:
  - Additional test files as needed
