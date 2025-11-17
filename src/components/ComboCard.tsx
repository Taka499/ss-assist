import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { CharacterAvatar } from './CharacterAvatar';
import type { Combo, Mission } from '../types';

interface ComboCardProps {
  combo: Combo;
  mission: Mission;
  characterLevels: Record<string, number>;
}

export function ComboCard({ combo, mission, characterLevels }: ComboCardProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Characters */}
      <div className="flex justify-center gap-4 mb-3">
        {combo.characters.map((char) => {
          const currentLevel = characterLevels[char.id] || 1;
          const deficit = Math.max(0, mission.requiredLevel - currentLevel);

          return (
            <CharacterAvatar
              key={char.id}
              character={char}
              dimmed={deficit > 0}
              levelDeficit={deficit}
            />
          );
        })}
      </div>

      {/* Badges */}
      <div className="flex justify-center gap-2">
        {combo.satisfiesBase && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            ✅ {t('status.canAccept')}
          </span>
        )}
        {combo.satisfiesBonus && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            ✅ {t('status.bonusAchieved')}
          </span>
        )}
      </div>
    </div>
  );
}
