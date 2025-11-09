import { useLanguageStore } from '../store/useLanguageStore';
import { CharacterAvatar } from './CharacterAvatar';
import type { Combo, Mission } from '../types';

interface ComboCardProps {
  combo: Combo;
  mission: Mission;
  characterLevels: Record<string, number>;
}

export function ComboCard({ combo, mission, characterLevels }: ComboCardProps) {
  const lang = useLanguageStore((state) => state.lang);

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
            {lang === 'ja' ? '✅ 受注達成' : lang === 'zh-Hans' ? '✅ 可接受' : '✅ 可接受'}
          </span>
        )}
        {combo.satisfiesBonus && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {lang === 'ja' ? '✅ 追加報酬達成' : lang === 'zh-Hans' ? '✅ 额外奖励' : '✅ 額外獎勵'}
          </span>
        )}
      </div>
    </div>
  );
}
