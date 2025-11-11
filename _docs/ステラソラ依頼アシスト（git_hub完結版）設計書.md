# ステラソラ依頼アシスト（GitHub完結版）設計書

> 目的：ユーザーが所持している巡游者（キャラ）とそのレベルから、選択した「依頼」の**受注条件**および**追加報酬条件**を満たす組み合わせ（最大3名）を列挙し、足りない場合は「誰を、どのレベルまで」優先育成すべきかを提示する。GitHub Pages だけで完結（サーバーレス）。

> **⚠️ タグIDアーキテクチャ：** 本設計では、タグIDに**手動割当の連番方式**（`role-001`, `style-002` など）を採用しています。これにより、将来的な公式英語版との競合を回避し、データメンテナンスの容易性を確保します。CSV/ソースファイルは日本語で記載し、変換時にIDに自動変換されます。

---

## 1. 要件整理

### 機能要件

1. **初期登録フロー**

   - 巡游者一覧（アイコン＋名前）を**暗い状態**で表示 → ユーザーが所持キャラのみクリックで明るく（所持フラグON）。
   - 所持キャラごとにレベルボタン（`1,10,20,30,40,50,60,70,80,90`）の単一選択。
   - 所持＆レベルは**ブラウザの localStorage** に保存（サインイン不要／プライバシー保護）。

2. **依頼選択**

   - 依頼データ（報酬・受注条件・追加報酬条件・必要レベル）から**最大4件**を選択。

3. **組み合わせ探索**

   - 各依頼について、所持キャラから**最大3名**の組み合わせで、
     - `all(受注条件 ⊆ tagSet)` を満たす解を列挙。
     - さらに `all(追加報酬条件 ⊆ tagSet)` を満たす解を別枠で強調。
   - 必要レベルを満たさないキャラは**暗く**表示し、足りないレベルをバッジ表示。

4. **育成優先度提案**

   - 現状満たせない依頼に対し、
     - "このキャラを **LvX** まで上げれば受注条件達成"、
     - "このキャラを **LvY** まで上げれば追加報酬条件も達成"、 をスコアリングして**次に育成すべき候補**をランキング提示。

5. **データ管理**

   - 巡游者・依頼・報酬を **JSON** で管理（Git リポジトリに同梱）。
   - 収集は Spreadsheet → JSON 変換スクリプトで反映（GitHub Actions で自動化可）。

### 非機能要件

- サーバーレス（GitHub Pages / 静的サイト）
- スマホ／PC 両対応（レスポンシブ）
- 言語：日本語（将来的に i18n 拡張）
- パフォーマンス：数十〜百名規模の巡游者でも快適に検索（ビットマスク最適化）

---

## 2. 技術スタック

- **フロント**：Vite + React + TypeScript + Tailwind CSS（軽量・静的ホスティング適性）
- **状態管理**：Zustand（シンプル・直列化しやすい）
- **データ永続化**：localStorage
- **ビルド／配信**：GitHub Pages（Actions で自動デプロイ）
- **データ生成**：Node.js スクリプト（Spreadsheet → JSON 変換）、Actions で自動実行

---

## 3. データモデル（JSON スキーマ）

### 3.1 タグ辞書（正規化）

- タグは言語中立な連番ID（`category-NNN`形式）で正規化し、参照を軽量化。カテゴリー別に管理。

```jsonc
// data/tags.json
{
  "role": [
    { "id": "role-001", "ja": "バランサー", "zh-Hans": "均衡", "zh-Hant": "均衡" },
    { "id": "role-002", "ja": "アタッカー", "zh-Hans": "输出", "zh-Hant": "輸出" },
    { "id": "role-003", "ja": "サポーター", "zh-Hans": "辅助", "zh-Hant": "輔助" }
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
    ...
  ],
  "element": [
    { "id": "element-001", "ja": "水" },
    { "id": "element-002", "ja": "火" },
    ...
  ],
  "rarity": [
    { "id": "rarity-005", "ja": "5" },
    { "id": "rarity-004", "ja": "4" }
  ]
}
```

- **IDは手動割当**（連番管理）。将来的に公式英語版が出ても競合しない。

### 3.2 巡游者（Traveler）

```jsonc
// data/characters.json
[
  {
    "id": "kohaku",
    "name": { "ja": "コハク", "zh-Hans": "琥珀", "zh-Hant": "琥珀" },
    "icon": "assets/characters/kohaku.png",
    "tags": {
      "role": ["role-002"],
      "style": ["style-004"],
      "faction": ["faction-005"],
      "element": ["element-001"],
      "rarity": ["rarity-005"]
    }
  },
  {
    "id": "minerva",
    "name": { "ja": "ミネルバ", "zh-Hans": "密涅瓦", "zh-Hant": "密涅瓦" },
    "icon": "assets/characters/minerva.png",
    "tags": {
      "role": ["role-001"],
      "style": ["style-003"],
      "faction": ["faction-008"],
      "element": ["element-004"],
      "rarity": ["rarity-005"]
    }
  }
]
```

- **タグは配列**（将来複数持ち／上方互換）、IDで参照
- 表示時は `tags.json` を参照してIDから日本語名に変換
- 名前も多言語対応（`{ ja, zh-Hans, zh-Hant }`）

### 3.3 依頼（Mission / Request）

```jsonc
// data/missions.json
[
  {
    "id": "m001",
    "name": { "ja": "旧遺跡の調査", "zh-Hans": "旧遗迹调查" },
    "requiredLevel": 50,
    "baseConditions": [
      { "category": "role", "anyOf": ["role-002", "role-001"] },
      { "category": "style", "anyOf": ["style-004"] },
      { "category": "faction", "anyOf": ["faction-005"] }
    ],
    "bonusConditions": [
      { "category": "style", "anyOf": ["style-003"] }
    ],
    "rewards": [
      { "type": "gold", "amount": 12000 },
      { "type": "item", "id": "mat_core", "amount": 2 }
    ]
  }
]
```

- **条件式の表現**：`category` 単位で `anyOf` を持ち、**派遣3名のタグ集合**に対し `all(category条件を満たす)` を判断。
- *例*：`role` は "アタッカー **または** バランサー" の誰かがいればOK。
- 将来の拡張として `allOf`/`noneOf` も追加可能（スキーマ後方互換）

### 3.4 報酬（Reward）

```ts
// TypeScript 型例
export type Reward =
  | { type: "gold"; amount: number }
  | { type: "item"; id: string; amount: number }
  | { type: "exp"; amount: number };
```

---

## 4. 所持データ（ローカル保存）

```ts
// localStorage キー例
"ss-owned-characters"   // string[] 例: ["kohaku","minerva"]
"ss-levels"            // Record<id, level> 例: { "kohaku": 60, "minerva": 40 }
"ss-selected-missions" // string[] 最大4件
```

---

## 5. 組み合わせ探索アルゴリズム

### 5.1 前処理（ビットマスク化）

- 各カテゴリーごとにタグIDをビットに割当。巡游者ごとにカテゴリー別ビットマスクを持つ。
- 依頼の `anyOf` も同一ビット空間で表現。
- 3名の合成は **ビット OR**。条件成立は `(comboMask & condMask) != 0` を各カテゴリーで確認し、すべて満たせばOK。
- これにより O(1) 判定。

### 5.2 組み合わせ列挙

- 所持N名から **最大3名**の組み合わせ。
  - 全列挙は `C(N,1)+C(N,2)+C(N,3)`。
  - 事前に *必要レベル未満のみ* のみ別処理に分け、**レベル充足済の候補**を優先フィルタ。
  - `condMask` と交わりがないキャラは単体で剪定（タグ未関与）。
- 依頼ごとに結果を
  - ✅ 受注達成（追加報酬達成/非達成で二段階）
  - ⚠️ 未達（最小育成セット提案） で出力。

### 5.3 育成優先度（スコアリング）

- 依頼セットSに対し、キャラ`t`のスコア例：
  - `w1 * (tをLv必要まで上げると受注達成できる依頼数)`
  - `w2 * (追加報酬が達成に変わる依頼数)`
  - `- w3 * (必要レベル - 現在レベル)`（コスト）
  - `+ w4 * (希少タグ寄与度)`（例えば該当タグを持つ所持キャラが少ないほど高加点）
- デフォルト係数例：`w1=3, w2=2, w3=0.05, w4=1`
- UI で係数調整スライダーを用意しても良い。

---

## 6. UI 設計

### 6.1 画面フロー

1. **オンボーディング / 所持登録**
   - グリッド：アイコン＋名前（デフォルト暗い）
   - クリックでトグル（明るい=所持）
   - フィルタ：属性/レアリティ/役割/スタイル/所属勢力（参考画像と同等のチップ）
2. **レベル設定**
   - 所持キャラのみの一覧（1行1キャラ）
   - レベルボタン（10刻み）の**ラジオ**ボタン風UI
3. **依頼選択**
   - カードリスト：報酬プレビュー、必要Lv、条件チップ
   - 最大4件まで選択（カウンタ表示）
4. **結果（最重要画面）**
   - 依頼ごとにタブ／アコーディオン
   - ✅ 受注達成：
     - 追加報酬達成の組み合わせ → **緑バッジ**
     - 受注のみ達成 → **青バッジ**
   - ⚠️ 未達の場合：
     - 「不足タグ」「最小育成案（誰をLvXまで）」
     - 推奨育成ランキング（全依頼横断）
   - 一覧のアイコン：必要Lv到達済みは通常、未到達は**暗く**＋`Lv+?`バッジ

### 6.2 コンポーネント

- `AppLayout`：ヘッダ（データ更新日、設定）／メイン
- `RosterSelector`（所持トグル＋フィルタ）
- `LevelEditor`（レベルボタン行）
- `MissionPicker`（4件上限）
- `ResultsView`
  - `ComboCard`（3名並び＋条件達成ピル）
  - `TrainHint`（最小育成案）
  - `TrainRanking`（次に育成すべき）
- `TagPill` / `RewardChip` / `CharacterAvatar`

### 6.3 アクセシビリティ

- キーボード操作／ARIA ラベル
- カラーのみ依存しないアイコン／ラベル

---

## 7. ディレクトリ構成（GitHub Pages 用）

```
stella-sora-helper/
├─ public/
│  └─ assets/
│     └─ characters/*.png
├─ data/
│  ├─ tags.json
│  ├─ characters.json
│  └─ missions.json
├─ scripts/
│  ├─ csv-to-json.ts          # スプレッドシートCSV→JSON 変換
│  └─ validate-data.ts        # JSON スキーマ検証
├─ src/
│  ├─ components/
│  ├─ lib/
│  │  ├─ data.ts              # ロード・ビットマスク化
│  │  ├─ combos.ts            # 組合せ探索
│  │  └─ scoring.ts           # 育成スコア
│  ├─ pages/
│  ├─ store/
│  ├─ types/
│  └─ main.tsx
├─ package.json
├─ vite.config.ts
├─ tailwind.config.js
└─ .github/workflows/pages.yml
```

---

## 8. 主要 TypeScript 型（抜粋）

```ts
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

export interface TagDict {
  role: TagEntry[];
  style: TagEntry[];
  faction: TagEntry[];
  element: TagEntry[];
  rarity: TagEntry[];
}

export interface Character {
  id: string;
  name: MultiLangString;
  icon: string; // 相対パス
  tags: Partial<Record<Category, string[]>>; // IDの配列
}

export interface Condition {
  category: Category;
  anyOf: string[]; // タグID配列。将来 allOf/noneOf を追加可
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
```

---

## 9. コンボ判定ロジック（擬似コード）

```ts
function satisfies(cond: Condition[], comboMask: Masks) {
  // Masks = Record<Category, number>
  return cond.every(c => (comboMask[c.category] & toMask(c)) !== 0);
}

function findCombos(mission: Mission, owned: Character[], levels: Record<string, number>) {
  const meetsLevel = (t: Character) => (levels[t.id] ?? 1) >= mission.requiredLevel;
  const candidates = owned.filter(t => interactsWith(mission, t)); // 交わりなしは剪定
  const combos = [] as Combo[];

  forEachComboUpTo3(candidates, combo => {
    const mask = mergeMasks(combo);
    const hasBase = satisfies(mission.baseConditions, mask);
    if (!hasBase) return;
    const hasBonus = satisfies(mission.bonusConditions ?? [], mask);
    combos.push({ combo, hasBonus, allMeetLevel: combo.every(meetsLevel) });
  });
  return rank(combos);
}
```

---

## 10. Spreadsheet → JSON 変換

### 10.1 入力CSV（例）

- **characters.csv**
  - `id,name_ja,name_zh-Hans,name_zh-Hant,icon,role,style,faction,element,rarity`
  - タグ列は**日本語ラベル**で記載（例：`アタッカー|バランサー`）
  - 変換時に `tags.json` から逆引きしてIDに変換
- **missions.csv**
  - `id,name_ja,name_zh-Hans,requiredLevel,base_role,base_style,base_faction,bonus_role,bonus_style,...,rewards`
  - タグ列は**日本語ラベル**で記載
  - `rewards` は `gold:12000|item:mat_core:2` 形式

### 10.2 変換スクリプト（概要）

```ts
// scripts/csv-to-json.ts（概要）
import { parse } from "csv-parse/sync";
import fs from "node:fs";

const SPLIT = (s?: string) => (s ? s.split("|").map(v => v.trim()).filter(Boolean) : []);

// 1. tags.src.json を読み込み、IDフォーマット検証後 tags.json へ出力
// 2. tags.json から逆引きマップ（日本語→ID）を作成
// 3. characters.csv を読み、日本語タグをIDに変換
// 4. missions.csv を読み、日本語タグをIDに変換

// 実行：npm run build:data
```

### 10.3 GitHub Actions 自動化

- `data-sources/` に CSV を置いてコミット → Action が `npm run build:data` 実行 → `data/*.json` を生成 → Pages ビルド。

---

## 11. 結果画面のUI詳細

- 依頼カード：
  - タイトル、必要Lv、報酬チップ（`G 12,000` / `素材x2`）
  - 条件チップ（カテゴリー色分け）
- 組合せリスト：
  - 左：3アイコン（暗/明＋Lvバッジ）
  - 右：`受注` / `追加報酬` バッジ、達成理由のタグハイライト
- 未達時：
  - **不足タグ一覧**（例：`style:収集家`）
  - **最小育成案**（例：`ミネルバ Lv50 → 受注達成`）
  - **優先育成ランキング**（全依頼横断）

---

## 12. パフォーマンス最適化

- カテゴリー別ビットマスク＋`anyOf` マスクで O(1) 判定
- `interactsWith` で候補絞り込み（少なくとも1条件の anyOf と交差するキャラのみ）
- メモ化：依頼×キャラでの事前マスク計算
- WebWorker 化は将来オプション（Nが大きくなった場合）

---

## 13. 品質（テスト/検証）

- **Vitest** で `combos.ts`、`scoring.ts` を単体テスト
- **json-schema** で `data/*.json` を構文検証（CI）

---

## 14. デザイン方針

- コレクション系UI（カード/チップ/バッジ）
- ダーク/ライト切替
- アイコンは 128×128 推奨（WebP/PNG）

---

## 15. セキュリティ/プライバシー

- 個人データは localStorage のみ（外部送信なし）
- GitHub Pages 上の静的JSONは**ゲーム内画像の著作権**に注意（自作/許諾素材を利用）

---

## 16. 将来拡張

- 依頼の**所要時間**、同時派遣制約、属性相性などの追加ロジック
- API 化（Cloudflare Workers 等）／PWA オフライン
- i18n、多言語タグ辞書
- 所持データの**共有用URL**生成（クエリ圧縮）

---

## 17. 進行プラン

1. ひな型作成（Vite/TS/Tailwind、Pages 自動デプロイ）
2. JSON スキーマと最小データ投入（コハク/ミネルバ＋サンプル依頼）
3. 所持登録UI＆localStorage
4. コンボ探索実装＆結果画面
5. スコアリングと育成提案
6. CSV→JSON スクリプト／CI
7. デザイン仕上げ＆リリース

---

## 付録A：サンプルデータ（最小）

**tags.json:**
```json
{
  "role": [
    { "id": "role-001", "ja": "バランサー", "zh-Hans": "均衡" },
    { "id": "role-002", "ja": "アタッカー", "zh-Hans": "输出" }
  ],
  "style": [
    { "id": "style-003", "ja": "しっかり者", "zh-Hans": "稳重" },
    { "id": "style-004", "ja": "収集家", "zh-Hans": "收集者" }
  ],
  "faction": [
    { "id": "faction-005", "ja": "空白旅団" },
    { "id": "faction-008", "ja": "ウィンドアッシュ" }
  ]
}
```

**characters.json:**
```json
[
  {
    "id": "kohaku",
    "name": { "ja": "コハク", "zh-Hans": "琥珀" },
    "icon": "assets/characters/kohaku.png",
    "tags": {
      "role": ["role-002"],
      "style": ["style-004"],
      "faction": ["faction-005"]
    }
  },
  {
    "id": "minerva",
    "name": { "ja": "ミネルバ", "zh-Hans": "密涅瓦" },
    "icon": "assets/characters/minerva.png",
    "tags": {
      "role": ["role-001"],
      "style": ["style-003"],
      "faction": ["faction-008"]
    }
  }
]
```

**missions.json:**
```json
[
  {
    "id": "m001",
    "name": { "ja": "旧遺跡の調査", "zh-Hans": "旧遗迹调查" },
    "requiredLevel": 50,
    "baseConditions": [
      { "category": "style", "anyOf": ["style-004"] },
      { "category": "faction", "anyOf": ["faction-005"] }
    ],
    "bonusConditions": [
      { "category": "role", "anyOf": ["role-002"] }
    ],
    "rewards": [
      { "type": "gold", "amount": 12000 }
    ]
  }
]
```

---

以上。これをベースに、初期ひな型（リポジトリ）と最小データを流し込み、UI ワイヤーを作れば即座に GitHub Pages で動作確認できます。必要なら**CSV→JSON 変換スクリプトの具体実装**や**初期リポのテンプレート**も追記します。

---

## 18. タグ追加の編集手順（手動ID割当方式）

> 新しいタグを追加する際は**編集する場所**と**手順**を明確化します。

### 18.1 編集箇所（人が触るファイル）

1. `data/tags.src.json` ・・・ **手動でID割当**した各カテゴリのタグを定義（例：`{ "id": "role-001", "ja": "アタッカー" }`）
2. （必要に応じて）`i18n/tags.zh-Hans.json` / `i18n/tags.zh-Hant.json` ・・・ 中国語翻訳を追加
3. （必要に応じて）`data-sources/characters.csv` ・・・ 巡游者のタグ列は**日本語**で記載（`|`区切り）
4. （必要に応じて）`data-sources/missions.csv` ・・・ 依頼条件のタグは**日本語**で記載

> ※ 配信用の `data/tags.json`／`data/characters.json`／`data/missions.json` は自動生成物のため**手で編集しない**。

### 18.2 変換の流れ

- Git にコミットすると GitHub Actions が `npm run build:data` を実行
- スクリプトの処理：
  1. `tags.src.json` を読み込み、IDフォーマット（`category-\d{3}`）を検証
  2. `i18n/` から中国語翻訳をマージし、`tags.json` に出力
  3. `tags.json` から逆引きマップ（日本語→ID）を作成
  4. CSV 読み込み時に日本語ラベルをIDに変換
- 生成物：
  - `data/tags.json`：`{ category: [{ id, ja, zh-Hans?, zh-Hant? }] }` 形式
  - `data/characters.json`：タグは ID 配列（例：`"role": ["role-002"]`）
  - `data/missions.json`：条件は `anyOf: ["role-002", ...]` の**ID参照**に変換
- CI で**IDフォーマット検証**／**参照整合性チェック**／**スキーマ検証**を実施。失敗時はPRにエラーを返す

### 18.3 追加タグの具体例

**新しいスタイルタグ「研究者」を追加する場合：**

1. `data/tags.src.json` に追記（連番を振る）：

```json
{
  "style": [
    { "id": "style-001", "ja": "冒険家" },
    { "id": "style-002", "ja": "独創性" },
    { "id": "style-003", "ja": "しっかり者" },
    { "id": "style-004", "ja": "収集家" },
    { "id": "style-005", "ja": "知的好奇心" },
    { "id": "style-006", "ja": "研究者" }  // ← 追加
  ]
}
```

2. （任意）中国語翻訳を追加：

```json
// i18n/tags.zh-Hans.json
{
  "style": {
    "研究者": "研究员"
  }
}
```

3. そのタグを使う巡游者/依頼を CSV に**日本語ラベル**で記載：

```csv
// characters.csv
char123,研究者キャラ,researcher,researcher,icon.png,アタッカー,研究者,faction,element,5
```

4. `npm run build:data`（ローカル）または PR 作成（CI が自動生成）
5. 動作確認：UI のフィルタやカードに新タグが表示され、条件判定に反映される

### 18.4 ディレクトリ構成への追記

```
└─ data/
   ├─ tags.src.json           # ★編集対象（手動ID割当、日本語ラベル）
   ├─ characters.json          # 生成物（ID参照）
   ├─ missions.json           # 生成物（ID参照）
   └─ tags.json               # 生成物（{id, ja, zh-Hans?, zh-Hant?}）
└─ data-sources/              # ★CSVを置く（日本語ラベルで記載）
   ├─ characters.csv
   └─ missions.csv
└─ i18n/                      # ★翻訳ファイル
   ├─ tags.zh-Hans.json       # 簡体字中国語
   └─ tags.zh-Hant.json       # 繁体字中国語
└─ scripts/
   ├─ csv-to-json.ts          # 日本語→ID 変換（逆引きマップ使用）
   └─ validate-data.ts        # IDフォーマット・参照整合性検証
```

### 18.5 運用ルール

- **IDは手動割当**：連番管理（`category-001`, `category-002`...）。将来の公式英語版と競合しない
- **CSV/ソースは日本語**：データメンテナンスが容易。変換時にIDに自動変換
- **多言語対応**：`i18n/` に翻訳を追加することで UI が自動的に対応言語で表示
- **IDフォーマット規則**：`^(role|style|faction|element|rarity)-\d{3}$` 形式を厳守
- タグ名称の表記ゆれは `tags.src.json` を**唯一の正**とし、CSV側は CI で一致チェック（ズレは警告）

