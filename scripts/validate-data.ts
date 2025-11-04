import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// Multi-language string schema
const multiLangStringSchema = {
  type: "object",
  properties: {
    ja: { type: "string" },
    "zh-Hans": { type: "string" },
    "zh-Hant": { type: "string" },
  },
  required: ["ja"],
  additionalProperties: false,
};

// Tag entry schema
const tagEntrySchema = {
  type: "object",
  properties: {
    id: { type: "string", pattern: "^(role|style|faction|element|rarity)-\\d{3}$" },
    ja: { type: "string" },
    "zh-Hans": { type: "string" },
    "zh-Hant": { type: "string" },
  },
  required: ["id", "ja"],
  additionalProperties: false,
};

// Tags dictionary schema
const tagsSchema = {
  type: "object",
  properties: {
    role: { type: "array", items: tagEntrySchema },
    style: { type: "array", items: tagEntrySchema },
    faction: { type: "array", items: tagEntrySchema },
    element: { type: "array", items: tagEntrySchema },
    rarity: { type: "array", items: tagEntrySchema },
  },
  required: ["role", "style", "faction", "element", "rarity"],
  additionalProperties: false,
};

// Condition schema
const conditionSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["role", "style", "faction", "element", "rarity"],
    },
    anyOf: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
  },
  required: ["category", "anyOf"],
  additionalProperties: false,
};

// Reward schema (discriminated union)
const rewardSchema = {
  oneOf: [
    {
      type: "object",
      properties: {
        type: { type: "string", const: "gold" },
        amount: { type: "number", minimum: 0 },
      },
      required: ["type", "amount"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { type: "string", const: "item" },
        id: { type: "string" },
        amount: { type: "number", minimum: 1 },
      },
      required: ["type", "id", "amount"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { type: "string", const: "exp" },
        amount: { type: "number", minimum: 0 },
      },
      required: ["type", "amount"],
      additionalProperties: false,
    },
  ],
};

// Character schema
const characterSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: multiLangStringSchema,
    icon: { type: "string" },
    tags: {
      type: "object",
      properties: {
        role: { type: "array", items: { type: "string" } },
        style: { type: "array", items: { type: "string" } },
        faction: { type: "array", items: { type: "string" } },
        element: { type: "array", items: { type: "string" } },
        rarity: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  required: ["id", "name", "icon", "tags"],
  additionalProperties: false,
};

// Characters array schema
const charactersSchema = {
  type: "array",
  items: characterSchema,
};

// Mission schema
const missionSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: multiLangStringSchema,
    requiredLevel: { type: "number", minimum: 1, maximum: 90 },
    baseConditions: {
      type: "array",
      items: conditionSchema,
    },
    bonusConditions: {
      type: "array",
      items: conditionSchema,
    },
    rewards: {
      type: "array",
      items: rewardSchema,
      minItems: 1,
    },
  },
  required: ["id", "name", "requiredLevel", "baseConditions", "rewards"],
  additionalProperties: false,
};

// Missions array schema
const missionsSchema = {
  type: "array",
  items: missionSchema,
};

// Compile validators
const validateTags = ajv.compile(tagsSchema);
const validateCharacters = ajv.compile(charactersSchema);
const validateMissions = ajv.compile(missionsSchema);

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

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
 * Format AJV validation errors
 */
function formatErrors(validator: any): string[] {
  if (!validator.errors) return [];
  return validator.errors.map(
    (err: any) => `  ${err.instancePath || "/"} ${err.message}`
  );
}

/**
 * Cross-validate tag references
 */
function crossValidate(tags: any, characters: any, missions: any): string[] {
  const errors: string[] = [];

  // Build set of all valid tag IDs
  const validTagIds = new Set<string>();
  for (const category of ["role", "style", "faction", "element", "rarity"]) {
    if (tags[category]) {
      for (const tag of tags[category]) {
        validTagIds.add(tag.id);
      }
    }
  }

  // Validate character tag references
  for (const character of characters) {
    if (character.tags) {
      for (const category of Object.keys(character.tags)) {
        for (const tagId of character.tags[category]) {
          if (!validTagIds.has(tagId)) {
            errors.push(
              `  Character "${character.id}" references unknown tag ID "${tagId}"`
            );
          }
        }
      }
    }
  }

  // Validate mission condition tag references
  for (const mission of missions) {
    const checkConditions = (conditions: any[], type: string) => {
      if (!conditions) return;
      for (const condition of conditions) {
        if (condition.anyOf) {
          for (const tagId of condition.anyOf) {
            if (!validTagIds.has(tagId)) {
              errors.push(
                `  Mission "${mission.id}" ${type} references unknown tag ID "${tagId}"`
              );
            }
          }
        }
      }
    };

    checkConditions(mission.baseConditions, "baseConditions");
    checkConditions(mission.bonusConditions, "bonusConditions");
  }

  return errors;
}

/**
 * Validate all data files
 */
export async function validateDataFiles(): Promise<ValidationResult> {
  const errors: string[] = [];
  const dataDir = resolve(process.cwd(), "data");

  console.log("Validating data files...\n");

  // Load files
  let tags: any, characters: any, missions: any;

  try {
    tags = loadJSON(resolve(dataDir, "tags.json"));
    console.log("✓ Loaded data/tags.json");
  } catch (error) {
    errors.push(`data/tags.json: ${(error as Error).message}`);
    tags = null;
  }

  try {
    characters = loadJSON(resolve(dataDir, "characters.json"));
    console.log("✓ Loaded data/characters.json");
  } catch (error) {
    errors.push(`data/characters.json: ${(error as Error).message}`);
    characters = null;
  }

  try {
    missions = loadJSON(resolve(dataDir, "missions.json"));
    console.log("✓ Loaded data/missions.json");
  } catch (error) {
    errors.push(`data/missions.json: ${(error as Error).message}`);
    missions = null;
  }

  console.log();

  // Validate schemas
  if (tags) {
    console.log("Validating data/tags.json...");
    if (!validateTags(tags)) {
      errors.push("data/tags.json schema validation failed:");
      errors.push(...formatErrors(validateTags));
    } else {
      console.log("✓ data/tags.json is valid");
    }
    console.log();
  }

  if (characters) {
    console.log("Validating data/characters.json...");
    if (!validateCharacters(characters)) {
      errors.push("data/characters.json schema validation failed:");
      errors.push(...formatErrors(validateCharacters));
    } else {
      console.log("✓ data/characters.json is valid");
    }
    console.log();
  }

  if (missions) {
    console.log("Validating data/missions.json...");
    if (!validateMissions(missions)) {
      errors.push("data/missions.json schema validation failed:");
      errors.push(...formatErrors(validateMissions));
    } else {
      console.log("✓ data/missions.json is valid");
    }
    console.log();
  }

  // Cross-validation
  if (tags && characters && missions) {
    console.log("Cross-validating tag references...");
    const crossErrors = crossValidate(tags, characters, missions);
    if (crossErrors.length > 0) {
      errors.push("Cross-validation failed:");
      errors.push(...crossErrors);
    } else {
      console.log("✓ All tag references are valid");
    }
    console.log();
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Run validation if called directly
// In ES modules, check if this file is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  validateDataFiles()
    .then((result) => {
      if (result.valid) {
        console.log("✅ All data files are valid!");
        process.exit(0);
      } else {
        console.error("❌ Validation failed:\n");
        for (const error of result.errors) {
          console.error(error);
        }
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Error during validation:", error);
      process.exit(1);
    });
}
