import { STELLASORA_DATA_BASE_URL, REGIONS } from "./config.js";
import type {
  DatamineCharacter,
  DatamineCharacterDes,
  DatamineCharacterTag,
  DatamineAgent,
  CharacterDataBundle,
  CommissionDataBundle,
  LanguageMap,
  RegionLanguage,
} from "./types.js";

async function fetchJSON<T>(relativePath: string): Promise<T> {
  const url = `${STELLASORA_DATA_BASE_URL}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAllCharacterData(): Promise<CharacterDataBundle> {
  // Bin files come from JP (all regions share the same bin data)
  const [characters, characterDes, characterTags] = await Promise.all([
    fetchJSON<Record<string, DatamineCharacter>>("JP/bin/Character.json"),
    fetchJSON<Record<string, DatamineCharacterDes>>("JP/bin/CharacterDes.json"),
    fetchJSON<Record<string, DatamineCharacterTag>>(
      "JP/bin/CharacterTag.json"
    ),
  ]);

  // Fetch language files for all regions in parallel
  const languages: RegionLanguage[] = await Promise.all(
    REGIONS.map(async (region) => {
      const [chars, tags] = await Promise.all([
        fetchJSON<LanguageMap>(
          `${region.dir}/language/${region.langDir}/Character.json`
        ),
        fetchJSON<LanguageMap>(
          `${region.dir}/language/${region.langDir}/CharacterTag.json`
        ),
      ]);
      return {
        langKey: region.langKey,
        characters: chars,
        characterTags: tags,
        agents: {},
      };
    })
  );

  return { characters, characterDes, characterTags, languages };
}

export async function fetchAllCommissionData(): Promise<CommissionDataBundle> {
  const [agents, characterTags] = await Promise.all([
    fetchJSON<Record<string, DatamineAgent>>("JP/bin/Agent.json"),
    fetchJSON<Record<string, DatamineCharacterTag>>(
      "JP/bin/CharacterTag.json"
    ),
  ]);

  const languages: RegionLanguage[] = await Promise.all(
    REGIONS.map(async (region) => {
      const [agentLang, tagLang] = await Promise.all([
        fetchJSON<LanguageMap>(
          `${region.dir}/language/${region.langDir}/Agent.json`
        ),
        fetchJSON<LanguageMap>(
          `${region.dir}/language/${region.langDir}/CharacterTag.json`
        ),
      ]);
      return {
        langKey: region.langKey,
        characters: {},
        characterTags: tagLang,
        agents: agentLang,
      };
    })
  );

  return { agents, characterTags, languages };
}
