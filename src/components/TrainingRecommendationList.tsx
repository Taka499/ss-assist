import { useLanguageStore } from '../store/useLanguageStore';
import { getCharacterById, getMissionById } from '../lib/data';
import type { TrainingRecommendationNew } from '../types';

interface TrainingRecommendationListProps {
  recommendations: TrainingRecommendationNew[];
}

export function TrainingRecommendationList({ recommendations }: TrainingRecommendationListProps) {
  const lang = useLanguageStore((state) => state.lang);

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>
          {lang === 'ja' ? '育成推奨はありません' : lang === 'zh-Hans' ? '无培养建议' : '無培養建議'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, idx) => {
        const character = getCharacterById(rec.characterId);
        const characterName = rec.characterName[lang] || rec.characterName.ja;

        return (
          <div key={`${rec.characterId}-${rec.targetLevel}-${idx}`} className="border-l-4 border-blue-500 bg-blue-50 pl-4 pr-4 py-3 rounded-r-lg">
            {/* Character Info */}
            <div className="flex items-center gap-3 mb-2">
              {character && (
                <img
                  src={character.icon}
                  alt={characterName}
                  className="w-12 h-12 rounded-full border-2 border-blue-300"
                />
              )}
              <div className="flex-1">
                <div className="font-semibold text-gray-800">
                  {characterName}
                  <span className="ml-2 text-yellow-600">{'★'.repeat(rec.characterRarity)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Lv{rec.currentLevel}</span>
                  <span className="mx-2 text-blue-500">→</span>
                  <span className="font-medium text-blue-600">Lv{rec.targetLevel}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  {lang === 'ja' ? '優先度' : lang === 'zh-Hans' ? '优先级' : '優先級'}
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {rec.priority.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Impact Details */}
            <div className="space-y-1">
              {rec.impact.missionsUnlocked.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-green-700">
                    ✅ {lang === 'ja' ? 'ミッション解放' : lang === 'zh-Hans' ? '解锁任务' : '解鎖任務'}:
                  </span>
                  <span className="ml-2 text-gray-700">
                    {rec.impact.missionsUnlocked.length}{lang === 'ja' ? '件' : lang === 'zh-Hans' ? '个' : '個'}
                  </span>
                  <div className="ml-4 text-xs text-gray-600 mt-1">
                    {rec.impact.missionsUnlocked.slice(0, 3).map(missionId => {
                      const mission = getMissionById(missionId);
                      if (!mission) return null;
                      return (
                        <div key={missionId} className="truncate">
                          • {mission.name[lang] || mission.name.ja}
                        </div>
                      );
                    })}
                    {rec.impact.missionsUnlocked.length > 3 && (
                      <div className="text-gray-500">
                        ... {lang === 'ja' ? '他' : lang === 'zh-Hans' ? '及其他' : '及其他'} {rec.impact.missionsUnlocked.length - 3} {lang === 'ja' ? '件' : lang === 'zh-Hans' ? '个' : '個'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {rec.impact.bonusesAdded.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-blue-700">
                    ⭐ {lang === 'ja' ? '追加報酬達成' : lang === 'zh-Hans' ? '额外奖励' : '額外獎勵'}:
                  </span>
                  <span className="ml-2 text-gray-700">
                    {rec.impact.bonusesAdded.length}{lang === 'ja' ? '件' : lang === 'zh-Hans' ? '个' : '個'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
