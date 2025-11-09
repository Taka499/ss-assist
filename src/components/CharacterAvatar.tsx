import { useLanguageStore } from '../store/useLanguageStore';
import type { Character } from '../types';

interface CharacterAvatarProps {
  character: Character;
  dimmed?: boolean;
  levelDeficit?: number;
}

export function CharacterAvatar({ character, dimmed = false, levelDeficit }: CharacterAvatarProps) {
  const lang = useLanguageStore((state) => state.lang);
  const name = character.name[lang] || character.name.ja;

  return (
    <div className="relative inline-block">
      <div
        className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 transition-all hover:scale-105 hover:shadow-lg ${
          dimmed ? 'opacity-50 grayscale' : ''
        }`}
      >
        <img
          src={character.icon}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>

      {levelDeficit && levelDeficit > 0 && (
        <span className="absolute bottom-0 right-0 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-tl rounded-br">
          Lv+{levelDeficit}
        </span>
      )}

      <p className="mt-1 text-xs text-center truncate max-w-[5rem]">{name}</p>
    </div>
  );
}
