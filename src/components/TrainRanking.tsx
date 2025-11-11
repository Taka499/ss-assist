import { useState } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { getCharacterById } from '../lib/data';
import { CharacterAvatar } from './CharacterAvatar';
import type { TrainingRecommendation } from '../types';

interface TrainRankingProps {
  recommendations: TrainingRecommendation[];
}

export function TrainRanking({ recommendations }: TrainRankingProps) {
  const lang = useLanguageStore((state) => state.lang);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {lang === 'ja' ? '育成の推奨はありません' :
          lang === 'zh-Hans' ? '没有培养推荐' : '沒有培養推薦'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {lang === 'ja' ? '優先育成ランキング' :
          lang === 'zh-Hans' ? '优先培养排名' : '優先培養排名'}
      </h3>

      <div className="space-y-3">
        {recommendations.slice(0, 10).map((rec, index) => {
          const character = getCharacterById(rec.characterId);
          if (!character) return null;

          const charName = character.name[lang] || character.name.ja;
          const isExpanded = expandedId === rec.characterId;

          const rankBadgeColors = [
            'bg-yellow-400 text-yellow-900', // 1st
            'bg-gray-300 text-gray-900',     // 2nd
            'bg-orange-400 text-orange-900', // 3rd
            'bg-blue-100 text-blue-700',     // 4th+
          ];
          const badgeColor = rankBadgeColors[Math.min(index, 3)];

          return (
            <div key={rec.characterId} className="p-4 bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setExpandedId(isExpanded ? null : rec.characterId)}
                className="w-full flex items-center gap-4"
              >
                {/* Rank Badge */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${badgeColor}`}>
                  {index + 1}
                </div>

                {/* Character Avatar */}
                <div className="flex-shrink-0">
                  <CharacterAvatar character={character} />
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <div className="font-semibold">{charName}</div>
                  <div className="text-sm text-gray-600">
                    Lv{rec.currentLevel} → Lv{rec.targetLevel}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {lang === 'ja' && `${rec.impact.baseConditionsUnlocked}件解放、${rec.impact.bonusConditionsAdded}件追加報酬`}
                    {lang === 'zh-Hans' && `解锁${rec.impact.baseConditionsUnlocked}个委托，${rec.impact.bonusConditionsAdded}个额外奖励`}
                    {lang === 'zh-Hant' && `解鎖${rec.impact.baseConditionsUnlocked}個委託，${rec.impact.bonusConditionsAdded}個額外獎勵`}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-lg font-bold text-blue-600">{rec.score.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">
                    {lang === 'ja' ? 'スコア' : lang === 'zh-Hans' ? '分数' : '分數'}
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0">
                  {isExpanded ? '▼' : '▶'}
                </div>
              </button>

              {/* Expanded Details (placeholder for future enhancement) */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                  {lang === 'ja' ? '詳細情報（実装予定）' :
                    lang === 'zh-Hans' ? '详细信息（计划实现）' : '詳細資訊（計劃實現）'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
