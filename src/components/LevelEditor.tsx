import { useAppStore } from '../store/useAppStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { getCharacterById } from '../lib/data';
import { CharacterAvatar } from './CharacterAvatar';

const LEVEL_OPTIONS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];

export function LevelEditor() {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);
  const { ownedCharacterIds, characterLevels, setCharacterLevel } = useAppStore();

  if (ownedCharacterIds.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('levels.noCharacters')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {t('levels.title')}
      </h3>

      <div className="space-y-3">
        {ownedCharacterIds.map((charId) => {
          const character = getCharacterById(charId);
          if (!character) return null;

          const currentLevel = characterLevels[charId] || 1;

          return (
            <div key={charId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <CharacterAvatar character={character} />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {LEVEL_OPTIONS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setCharacterLevel(charId, level)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentLevel === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                      Lv{level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
