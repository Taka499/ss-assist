import { useState } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { getCharacterById } from '../lib/data';
import { CharacterAvatar } from './CharacterAvatar';
import type { TrainingRecommendation } from '../types';

interface TrainRankingProps {
  recommendations: TrainingRecommendation[];
}

export function TrainRanking({ recommendations }: TrainRankingProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('training.noRecommendations')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {t('training.priorityRanking')}
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
                    {t('training.unlockSummary', {
                      base: rec.impact.baseConditionsUnlocked,
                      bonus: rec.impact.bonusConditionsAdded
                    })}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-lg font-bold text-blue-600">{rec.score.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">
                    {t('training.score')}
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
                  {t('training.detailsPlaceholder')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
