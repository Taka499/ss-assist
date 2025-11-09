import { useLanguageStore } from '../store/useLanguageStore';
import { getCharacterById, getMissions } from '../lib/data';
import { CharacterAvatar } from './CharacterAvatar';
import type { TrainingRecommendation } from '../types';

interface TrainHintProps {
  missionId: string;
  recommendations: TrainingRecommendation[];
}

export function TrainHint({ missionId, recommendations }: TrainHintProps) {
  const lang = useLanguageStore((state) => state.lang);

  const mission = getMissions().find((m) => m.id === missionId);
  if (!mission || recommendations.length === 0) return null;

  // Show top 3 recommendations for this mission
  const topRecs = recommendations.slice(0, 3);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h4 className="font-semibold text-yellow-900 mb-3">
        {lang === 'ja' && `「${mission.name.ja}」を解放するには:`}
        {lang === 'zh-Hans' && `解锁「${mission.name['zh-Hans'] || mission.name.ja}」:`}
        {lang === 'zh-Hant' && `解鎖「${mission.name['zh-Hant'] || mission.name.ja}」:`}
      </h4>

      <ul className="space-y-2">
        {topRecs.map((rec) => {
          const character = getCharacterById(rec.characterId);
          if (!character) return null;

          const charName = character.name[lang] || character.name.ja;

          return (
            <li key={rec.characterId} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CharacterAvatar character={character} />
              </div>
              <div className="text-sm">
                <span className="font-medium">{charName}</span>
                {' '}
                {lang === 'ja' && `を Lv${rec.targetLevel} まで上げる`}
                {lang === 'zh-Hans' && `升至 Lv${rec.targetLevel}`}
                {lang === 'zh-Hant' && `升至 Lv${rec.targetLevel}`}
                {rec.impact.bonusConditionsAdded > 0 && (
                  <span className="text-green-600">
                    {' → '}
                    {lang === 'ja' ? '追加報酬達成' : lang === 'zh-Hans' ? '额外奖励' : '額外獎勵'}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
