import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { getCharacterById, getCommissions } from '../lib/data';
import { CharacterAvatar } from './CharacterAvatar';
import type { TrainingRecommendation } from '../types';

interface TrainHintProps {
  commissionId: string;
  recommendations: TrainingRecommendation[];
}

export function TrainHint({ commissionId, recommendations }: TrainHintProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);

  const commission = getCommissions().find((m) => m.id === commissionId);
  if (!commission || recommendations.length === 0) return null;

  // Show top 3 recommendations for this mission
  const topRecs = recommendations.slice(0, 3);
  const commissionName = commission.name[lang] || commission.name.ja;

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h4 className="font-semibold text-yellow-900 mb-3">
        {t('training.unlockMission', { commissionName })}
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
                {t('training.levelUpTo', { level: rec.targetLevel })}
                {rec.impact.bonusConditionsAdded > 0 && (
                  <span className="text-green-600">
                    {' → '}
                    {t('training.bonusReward')}
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
