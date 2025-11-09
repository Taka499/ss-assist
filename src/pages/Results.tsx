import { useEffect, useState } from 'react';
import { loadData, isDataLoaded, getMissionById, getCharacters, getTags, getBitmaskLookup, getCharacterById } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAppStore } from '../store/useAppStore';
import { findCombinations, type CombinationSearchResult, type Combination } from '../lib/combos';
import { calculateTrainingPriority, type TrainingRecommendation as LibTrainingRecommendation } from '../lib/scoring';
import { ComboCard } from '../components/ComboCard';
import { TrainHint } from '../components/TrainHint';
import { TrainRanking } from '../components/TrainRanking';
import type { Combo, Character } from '../types';

interface ResultsProps {
  onNavigate: (page: string) => void;
}

export function Results({ onNavigate }: ResultsProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { selectedMissionIds, ownedCharacterIds, characterLevels, clearOwnedCharacters, clearLevels, clearSelectedMissions } = useAppStore();

  const [results, setResults] = useState<CombinationSearchResult[]>([]);
  const [trainingPriority, setTrainingPriority] = useState<LibTrainingRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    if (!isDataLoaded()) {
      loadData().catch(console.error);
      return;
    }

    // Perform analysis when data is loaded and selections exist
    if (selectedMissionIds.length > 0) {
      analyzeResults();
    } else {
      setIsAnalyzing(false);
    }
  }, [selectedMissionIds, ownedCharacterIds, characterLevels]);

  const analyzeResults = () => {
    setIsAnalyzing(true);

    try {
      const bitmaskLookup = getBitmaskLookup();
      const allCharacters = getCharacters();
      const tags = getTags();

      // Get owned characters
      const ownedCharacters = allCharacters.filter((char) =>
        ownedCharacterIds.includes(char.id)
      );

      // Find combinations for each selected mission
      const combinationResults: CombinationSearchResult[] = [];
      const missions = [];

      for (const missionId of selectedMissionIds) {
        const mission = getMissionById(missionId);
        if (!mission) continue;

        missions.push(mission);
        const result = findCombinations(
          mission,
          ownedCharacters,
          characterLevels,
          bitmaskLookup
        );
        combinationResults.push(result);
      }

      setResults(combinationResults);

      // Calculate training priority across all selected missions
      if (missions.length > 0 && ownedCharacters.length > 0) {
        const priority = calculateTrainingPriority(
          missions,
          ownedCharacters,
          characterLevels,
          bitmaskLookup,
          tags
        );
        setTrainingPriority(priority);
      }
    } catch (error) {
      console.error('Error analyzing results:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Transform Combination to Combo for ComboCard
  const transformCombination = (combination: Combination): Combo | null => {
    const characters: Character[] = [];
    for (const charId of combination.characterIds) {
      const char = getCharacterById(charId);
      if (char) characters.push(char);
    }

    if (characters.length !== combination.characterIds.length) {
      return null; // Some characters not found
    }

    return {
      characters,
      satisfiesBase: combination.meetsBaseConditions,
      satisfiesBonus: combination.meetsBonusConditions,
      mask: 0, // Not used by ComboCard
    };
  };

  if (!isDataLoaded()) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">
          {lang === 'ja' ? '読み込み中...' : lang === 'zh-Hans' ? '加载中...' : '載入中...'}
        </p>
      </div>
    );
  }

  if (selectedMissionIds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {lang === 'ja' ? '依頼を選択してください' :
            lang === 'zh-Hans' ? '请先选择委托' : '請先選擇委託'}
        </p>
        <button
          onClick={() => onNavigate('missions')}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {lang === 'ja' ? '依頼選択へ' :
            lang === 'zh-Hans' ? '前往选择委托' : '前往選擇委託'}
        </button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">
          {lang === 'ja' ? '分析中...' : lang === 'zh-Hans' ? '分析中...' : '分析中...'}
        </p>
      </div>
    );
  }

  const handleReset = () => {
    clearOwnedCharacters();
    clearLevels();
    clearSelectedMissions();
    onNavigate('home');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {lang === 'ja' ? '分析結果' :
            lang === 'zh-Hans' ? '分析结果' : '分析結果'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('missions')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            {lang === 'ja' ? '戻る' : lang === 'zh-Hans' ? '返回' : '返回'}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            {lang === 'ja' ? 'リセット' : lang === 'zh-Hans' ? '重置' : '重置'}
          </button>
        </div>
      </div>

      {/* Mission Results */}
      <div className="space-y-6">
        {results.map((result) => {
          const mission = getMissionById(result.missionId);
          if (!mission) return null;

          // Filter training recommendations for this specific mission
          const missionRecommendations = trainingPriority.filter(rec =>
            rec.impact.affectedMissions.includes(result.missionId)
          );

          return (
            <div key={result.missionId} className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {mission.name[lang] || mission.name.ja}
              </h2>

              {result.satisfiable ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {lang === 'ja' ? `${result.combinations.length}件の組み合わせが見つかりました` :
                      lang === 'zh-Hans' ? `找到${result.combinations.length}个组合` :
                        `找到${result.combinations.length}個組合`}
                  </p>

                  <div className="space-y-3">
                    {result.bestCombinations.slice(0, 5).map((combination, idx) => {
                      const combo = transformCombination(combination);
                      if (!combo) return null;

                      return (
                        <ComboCard
                          key={idx}
                          combo={combo}
                          mission={mission}
                          characterLevels={characterLevels}
                        />
                      );
                    })}
                  </div>

                  {result.combinations.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      {lang === 'ja' ? `他 ${result.combinations.length - 5} 件の組み合わせ` :
                        lang === 'zh-Hans' ? `还有 ${result.combinations.length - 5} 个组合` :
                          `還有 ${result.combinations.length - 5} 個組合`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-amber-600 mb-3">
                    {lang === 'ja' ? '現在の編成では受注条件を満たせません' :
                      lang === 'zh-Hans' ? '当前编队无法满足委托条件' :
                        '當前編隊無法滿足委託條件'}
                  </p>
                  <TrainHint
                    missionId={result.missionId}
                    recommendations={missionRecommendations}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Training Priority Ranking */}
      {trainingPriority.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {lang === 'ja' ? '育成優先度ランキング' :
              lang === 'zh-Hans' ? '培养优先级排名' : '培養優先級排名'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {lang === 'ja' ? '選択した依頼を効率的にクリアするための育成推奨' :
              lang === 'zh-Hans' ? '为高效完成所选委托的培养建议' :
                '為高效完成所選委託的培養建議'}
          </p>
          <TrainRanking recommendations={trainingPriority.slice(0, 10)} />
        </div>
      )}
    </div>
  );
}
