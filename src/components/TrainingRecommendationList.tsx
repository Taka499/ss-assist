import { useLanguageStore } from '../store/useLanguageStore';
import { getCharacterById } from '../lib/data';
import { TagPill } from './TagPill';
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

  // Group recommendations by role+style combinations for better categorization
  const groupedByRoleStyle: Record<string, TrainingRecommendationNew[]> = {};
  recommendations.forEach(rec => {
    const character = getCharacterById(rec.characterId);
    if (!character) return;

    const roleTag = character.tags.role?.[0] || 'unknown';
    const styleTag = character.tags.style?.[0] || 'unknown';
    const groupKey = `${roleTag}|${styleTag}`;

    if (!groupedByRoleStyle[groupKey]) {
      groupedByRoleStyle[groupKey] = [];
    }
    groupedByRoleStyle[groupKey].push(rec);
  });

  // Sort groups by total priority (sum of priorities in that group)
  const sortedGroups = Object.entries(groupedByRoleStyle).sort(([, recsA], [, recsB]) => {
    const sumA = recsA.reduce((sum, r) => sum + r.priority, 0);
    const sumB = recsB.reduce((sum, r) => sum + r.priority, 0);
    return sumB - sumA; // Higher priority first
  });

  return (
    <div>
      {/* Impact Legend */}
      <div className="mb-4 flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="text-green-700">✅</span>
          <span>{lang === 'ja' ? 'ミッション解放' : lang === 'zh-Hans' ? '解锁任务' : '解鎖任務'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-blue-700">⭐</span>
          <span>{lang === 'ja' ? '追加報酬達成' : lang === 'zh-Hans' ? '额外奖励' : '額外獎勵'}</span>
        </div>
      </div>

      {/* Groups in Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedGroups.map(([groupKey, recs]) => {
          const [roleTag, styleTag] = groupKey.split('|');

          return (
            <div key={groupKey} className="border border-gray-200 rounded-lg p-3 bg-white">
              {/* Role + Style Group Header */}
              <div className="mb-2 flex gap-1.5 items-center border-b border-gray-200 pb-2">
                <TagPill tagId={roleTag} category="role" highlight={true} />
                <TagPill tagId={styleTag} category="style" highlight={true} />
              </div>

              {/* Recommendations in this group */}
              <div className="space-y-1.5">
                {recs.map((rec, idx) => {
                  const character = getCharacterById(rec.characterId);
                  const characterName = rec.characterName[lang] || rec.characterName.ja;

                  return (
                    <div key={`${rec.characterId}-${rec.targetLevel}-${idx}`} className="border-l-3 border-blue-500 bg-blue-50 pl-2 pr-2 py-1 rounded-r-md">
                      {/* Character Info - Compact Row */}
                      <div className="flex items-center gap-2">
                        {character && (
                          <img
                            src={character.icon}
                            alt={characterName}
                            className="w-7 h-7 rounded-full border border-blue-300 flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-semibold text-gray-800 truncate">{characterName}</span>
                            <span className="text-yellow-600" style={{fontSize: '10px'}}>{'★'.repeat(rec.characterRarity)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <span>Lv{rec.currentLevel}</span>
                            <span className="text-blue-500">→</span>
                            <span className="font-medium text-blue-600">Lv{rec.targetLevel}</span>
                            {character?.tags.element?.map(tagId => (
                              <TagPill key={tagId} tagId={tagId} category="element" />
                            ))}
                          </div>
                        </div>
                        {/* Impact - Compact */}
                        <div className="flex items-center gap-1 flex-shrink-0" style={{fontSize: '11px'}}>
                          {rec.impact.missionsUnlocked.length > 0 && (
                            <span className="text-green-700 font-semibold">✅{rec.impact.missionsUnlocked.length}</span>
                          )}
                          {rec.impact.bonusesAdded.length > 0 && (
                            <span className="text-blue-700 font-semibold">⭐{rec.impact.bonusesAdded.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
