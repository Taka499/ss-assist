import { describe, it, expect } from "vitest";
import { transformCharacters, transformCommissions } from "./transform.js";
import type {
  CharacterDataBundle,
  CommissionDataBundle,
  DatamineCharacter,
  DatamineCharacterDes,
  DatamineCharacterTag,
  DatamineAgent,
  RegionLanguage,
} from "./types.js";

// ── Test helpers ──

function makeCharBundle(
  chars: Record<string, Partial<DatamineCharacter>>,
  des: Record<string, Partial<DatamineCharacterDes>>,
  tags: Record<string, Partial<DatamineCharacterTag>>,
  jaCharNames: Record<string, string>,
  jaTagNames: Record<string, string>,
  extraLangs?: Partial<RegionLanguage>[]
): CharacterDataBundle {
  const fullChars: Record<string, DatamineCharacter> = {};
  for (const [k, v] of Object.entries(chars)) {
    fullChars[k] = {
      Id: parseInt(k, 10),
      Grade: 2,
      Class: 1,
      EET: 1,
      Faction: 1,
      Visible: true,
      Available: true,
      Name: `Character.${k}.1`,
      ...v,
    };
  }

  const fullDes: Record<string, DatamineCharacterDes> = {};
  for (const [k, v] of Object.entries(des)) {
    fullDes[k] = {
      Id: parseInt(k, 10),
      Tag: [101, 201, 301],
      Force: 1,
      ...v,
    };
  }

  const fullTags: Record<string, DatamineCharacterTag> = {};
  for (const [k, v] of Object.entries(tags)) {
    fullTags[k] = {
      Id: parseInt(k, 10),
      Title: `CharacterTag.${k}.1`,
      TagType: 1,
      ...v,
    };
  }

  const jaLang: RegionLanguage = {
    langKey: "ja",
    characters: jaCharNames,
    characterTags: jaTagNames,
    agents: {},
  };

  const languages: RegionLanguage[] = [
    jaLang,
    ...(extraLangs ?? []).map((l) => ({
      langKey: l.langKey ?? "en",
      characters: l.characters ?? {},
      characterTags: l.characterTags ?? {},
      agents: l.agents ?? {},
    })),
  ];

  return { characters: fullChars, characterDes: fullDes, characterTags: fullTags, languages };
}

function makeCommBundle(
  agents: Record<string, Partial<DatamineAgent>>,
  tags: Record<string, Partial<DatamineCharacterTag>>,
  jaAgentNames: Record<string, string>,
  jaTagNames: Record<string, string>
): CommissionDataBundle {
  const fullAgents: Record<string, DatamineAgent> = {};
  for (const [k, v] of Object.entries(agents)) {
    fullAgents[k] = {
      Id: parseInt(k, 10),
      Tab: 2,
      Note: `Agent.${k}.1`,
      Name: `Agent.${k}.2`,
      Level: 1,
      MemberLimit: 3,
      Tags: [102],
      ExtraTags: [204],
      Quality: 1,
      Time1: 240,
      Time2: 480,
      Time3: 720,
      Time4: 1200,
      RewardPreview1: "[[1,100,100]]",
      RewardPreview2: "[[1,200,200]]",
      RewardPreview3: "[[1,300,300]]",
      RewardPreview4: "[[1,400,400]]",
      BonusPreview1: "[[1,10,10]]",
      BonusPreview2: "[[1,20,20]]",
      BonusPreview3: "[[1,30,30]]",
      BonusPreview4: "[[1,40,40]]",
      ...v,
    };
  }

  const fullTags: Record<string, DatamineCharacterTag> = {};
  for (const [k, v] of Object.entries(tags)) {
    fullTags[k] = {
      Id: parseInt(k, 10),
      Title: `CharacterTag.${k}.1`,
      TagType: 1,
      ...v,
    };
  }

  const jaLang: RegionLanguage = {
    langKey: "ja",
    characters: {},
    characterTags: jaTagNames,
    agents: jaAgentNames,
  };

  return { agents: fullAgents, characterTags: fullTags, languages: [jaLang] };
}

// ── Character transform tests ──

describe("transformCharacters", () => {
  it("transforms a basic character correctly", () => {
    const bundle = makeCharBundle(
      { "103": { Grade: 2, EET: 2, Class: 1 } },
      { "103": { Tag: [101, 204, 305] } },
      {
        "101": { TagType: 1 },
        "204": { TagType: 2 },
        "305": { TagType: 3 },
      },
      { "Character.103.1": "コハク" },
      {
        "CharacterTag.101.1": "アタッカー",
        "CharacterTag.204.1": "独創性",
        "CharacterTag.305.1": "白沢管理局",
      }
    );

    const result = transformCharacters(bundle, []);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "char-001",
      name_ja: "コハク",
      role: "アタッカー",
      style: "独創性",
      faction: "白沢管理局",
      element: "火",
      rarity: "4",
      icon: "assets/characters/char-001.png",
    });
    expect(result.newEntries).toHaveLength(1);
    expect(result.newEntries[0].name_ja).toBe("コハク");
  });

  it("matches existing characters by name_ja", () => {
    const bundle = makeCharBundle(
      { "103": { Grade: 2, EET: 2 } },
      { "103": { Tag: [101, 201, 301] } },
      {
        "101": { TagType: 1 },
        "201": { TagType: 2 },
        "301": { TagType: 3 },
      },
      { "Character.103.1": "コハク" },
      {
        "CharacterTag.101.1": "アタッカー",
        "CharacterTag.201.1": "収集家",
        "CharacterTag.301.1": "空白旅団",
      }
    );

    const existing = [
      { id: "char-003", name_ja: "コハク", "name_zh-Hans": "琥珀" },
    ];

    const result = transformCharacters(bundle, existing as any);

    expect(result.rows[0].id).toBe("char-003"); // Reuses existing ID
    expect(result.newEntries).toHaveLength(0); // Not new
  });

  it("skips unreleased characters with ??? name", () => {
    const bundle = makeCharBundle(
      { "999": {} },
      { "999": {} },
      { "101": { TagType: 1 }, "201": { TagType: 2 }, "301": { TagType: 3 } },
      { "Character.999.1": "???" },
      {
        "CharacterTag.101.1": "アタッカー",
        "CharacterTag.201.1": "収集家",
        "CharacterTag.301.1": "空白旅団",
      }
    );

    const result = transformCharacters(bundle, []);
    expect(result.rows).toHaveLength(0);
  });

  it("maps Grade 1 → rarity 5, Grade 2 → rarity 4", () => {
    const bundle5 = makeCharBundle(
      { "100": { Grade: 1, EET: 5 } },
      { "100": { Tag: [101, 201, 301] } },
      { "101": { TagType: 1 }, "201": { TagType: 2 }, "301": { TagType: 3 } },
      { "Character.100.1": "スター" },
      {
        "CharacterTag.101.1": "アタッカー",
        "CharacterTag.201.1": "収集家",
        "CharacterTag.301.1": "空白旅団",
      }
    );

    const result = transformCharacters(bundle5, []);
    expect(result.rows[0].rarity).toBe("5");
    expect(result.rows[0].element).toBe("光");
  });

  it("maps all 6 elements correctly", () => {
    const eetMap: Record<number, string> = {
      1: "水",
      2: "火",
      3: "地",
      4: "風",
      5: "光",
      6: "闇",
    };

    for (const [eet, expected] of Object.entries(eetMap)) {
      const bundle = makeCharBundle(
        { "100": { EET: parseInt(eet, 10) } },
        { "100": {} },
        { "101": { TagType: 1 }, "201": { TagType: 2 }, "301": { TagType: 3 } },
        { "Character.100.1": `テスト${eet}` },
        {
          "CharacterTag.101.1": "アタッカー",
          "CharacterTag.201.1": "収集家",
          "CharacterTag.301.1": "空白旅団",
        }
      );
      const result = transformCharacters(bundle, []);
      expect(result.rows[0].element).toBe(expected);
    }
  });

  it("includes multi-language names", () => {
    const bundle = makeCharBundle(
      { "103": {} },
      { "103": {} },
      { "101": { TagType: 1 }, "201": { TagType: 2 }, "301": { TagType: 3 } },
      { "Character.103.1": "コハク" },
      {
        "CharacterTag.101.1": "アタッカー",
        "CharacterTag.201.1": "収集家",
        "CharacterTag.301.1": "空白旅団",
      },
      [
        {
          langKey: "en",
          characters: { "Character.103.1": "Amber" },
          characterTags: {},
        },
        {
          langKey: "zh-Hans",
          characters: { "Character.103.1": "琥珀" },
          characterTags: {},
        },
      ]
    );

    const result = transformCharacters(bundle, []);
    expect(result.rows[0].name_en).toBe("Amber");
    expect(result.rows[0]["name_zh-Hans"]).toBe("琥珀");
  });
});

// ── Commission transform tests ──

describe("transformCommissions", () => {
  it("transforms a basic commission correctly", () => {
    const bundle = makeCommBundle(
      {
        "100101": {
          Tags: [102],
          ExtraTags: [204],
          Level: 1,
          Time1: 240,
          Time2: 480,
          Time3: 720,
          Time4: 1200,
          RewardPreview1: "[[1,13200,13200],[33001,1,2]]",
          BonusPreview1: "[[1,2640,2640]]",
          RewardPreview2: "[[1,26400,26400]]",
          BonusPreview2: "[[1,5280,5280]]",
          RewardPreview3: "[[1,39600,39600]]",
          BonusPreview3: "[[1,7920,7920]]",
          RewardPreview4: "[[1,66000,66000]]",
          BonusPreview4: "[[1,13200,13200]]",
        },
      },
      {
        "102": { TagType: 1 },
        "204": { TagType: 2 },
      },
      { "100101.1": "「資金獲得 初級」" },
      {
        "CharacterTag.102.1": "バランサー",
        "CharacterTag.204.1": "独創性",
      }
    );

    const result = transformCommissions(bundle, []);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "m-001",
      name_ja: "資金獲得 初級",
      requiredLevel: "1",
      base_role: "バランサー",
      bonus_style: "独創性",
    });
    expect(result.rows[0].duration_1_hours).toBe("4");
    expect(result.rows[0].duration_1_rewards).toBe("dorra:13200|prize_egg:1~2");
    expect(result.rows[0].duration_1_bonus_rewards).toBe("dorra:2640");
  });

  it("handles Tab 5 commissions with only 2 time slots", () => {
    const bundle = makeCommBundle(
      {
        "300101": {
          Tab: 5,
          Tags: [101],
          ExtraTags: [205],
          Time1: 720,
          Time2: 1200,
          Time3: undefined,
          Time4: undefined,
          RewardPreview1: "[[32001,11,11],[32000,6,7],[33001,1,2]]",
          BonusPreview1: "[[32001,2,3]]",
          RewardPreview2: "[[32001,18,18],[32000,10,11],[33001,2,4]]",
          BonusPreview2: "[[32001,4,5]]",
          RewardPreview3: undefined,
          BonusPreview3: undefined,
          RewardPreview4: undefined,
          BonusPreview4: undefined,
        },
      },
      {
        "101": { TagType: 1 },
        "205": { TagType: 2 },
      },
      { "300101.1": "「音楽ゲーム依頼 初級」" },
      {
        "CharacterTag.101.1": "アタッカー",
        "CharacterTag.205.1": "知的好奇心",
      }
    );

    const result = transformCommissions(bundle, []);

    expect(result.rows[0].duration_1_hours).toBe("12");
    expect(result.rows[0].duration_1_rewards).toBe(
      "skill_music_t1:11|piece_t1:6~7|prize_egg:1~2"
    );
    expect(result.rows[0].duration_2_hours).toBe("20");
    expect(result.rows[0].duration_3_hours).toBe("");
    expect(result.rows[0].duration_4_hours).toBe("");
  });

  it("strips 「」brackets from commission names", () => {
    const bundle = makeCommBundle(
      { "100101": {} },
      { "102": { TagType: 1 }, "204": { TagType: 2 } },
      { "100101.1": "「テスト依頼」" },
      { "CharacterTag.102.1": "バランサー", "CharacterTag.204.1": "独創性" }
    );

    const result = transformCommissions(bundle, []);
    expect(result.rows[0].name_ja).toBe("テスト依頼");
  });

  it("formats reward ranges correctly", () => {
    const bundle = makeCommBundle(
      {
        "100101": {
          RewardPreview1: "[[1,100,100],[33001,1,3]]",
          BonusPreview1: "[[1,0,1]]",
        },
      },
      { "102": { TagType: 1 }, "204": { TagType: 2 } },
      { "100101.1": "「テスト」" },
      { "CharacterTag.102.1": "バランサー", "CharacterTag.204.1": "独創性" }
    );

    const result = transformCommissions(bundle, []);
    // min == max → no range
    // min != max → range with ~
    expect(result.rows[0].duration_1_rewards).toBe("dorra:100|prize_egg:1~3");
    expect(result.rows[0].duration_1_bonus_rewards).toBe("dorra:0~1");
  });

  it("maps multiple base tags to correct categories", () => {
    const bundle = makeCommBundle(
      {
        "100101": {
          Tags: [101, 102], // Two roles
          ExtraTags: [203, 205], // Two styles
        },
      },
      {
        "101": { TagType: 1 },
        "102": { TagType: 1 },
        "203": { TagType: 2 },
        "205": { TagType: 2 },
      },
      { "100101.1": "「テスト」" },
      {
        "CharacterTag.101.1": "アタッカー",
        "CharacterTag.102.1": "バランサー",
        "CharacterTag.203.1": "冒険家",
        "CharacterTag.205.1": "知的好奇心",
      }
    );

    const result = transformCommissions(bundle, []);
    expect(result.rows[0].base_role).toBe("アタッカー|バランサー");
    expect(result.rows[0].bonus_style).toBe("冒険家|知的好奇心");
  });
});
