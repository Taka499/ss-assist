import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { getCharacters, getTags } from '../lib/data';
import { CharacterAvatar } from './CharacterAvatar';
import { TagPill } from './TagPill';
import type { Category, Character } from '../types';

export function RosterSelector() {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);
  const { ownedCharacterIds, toggleCharacterOwnership } = useAppStore();

  const characters = getCharacters();
  const tags = getTags();

  // Filter state: Map<Category, Set<tagId>>
  const [filters, setFilters] = useState<Map<Category, Set<string>>>(new Map());

  // Toggle a tag filter
  const toggleFilter = (category: Category, tagId: string) => {
    setFilters((prev) => {
      const newFilters = new Map(prev);
      const categorySet = new Set(newFilters.get(category) || []);

      if (categorySet.has(tagId)) {
        categorySet.delete(tagId);
      } else {
        categorySet.add(tagId);
      }

      if (categorySet.size === 0) {
        newFilters.delete(category);
      } else {
        newFilters.set(category, categorySet);
      }

      return newFilters;
    });
  };

  // Check if character passes all active filters
  const passesFilters = (character: Character) => {
    if (filters.size === 0) return true;

    // Must match ALL categories (AND across categories)
    for (const [category, selectedTags] of filters) {
      const charTags = character.tags[category] || [];
      // Must have at least ONE of the selected tags in this category (OR within category)
      const hasMatch = charTags.some((tagId) => selectedTags.has(tagId));
      if (!hasMatch) return false;
    }

    return true;
  };

  const filteredCharacters = characters.filter(passesFilters);

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {t('roster.filter')}
        </h3>

        {(['role', 'style', 'faction', 'element', 'rarity'] as Category[]).map((category) => (
          <div key={category} className="space-y-2">
            <h4 className="text-sm font-medium capitalize">{category}</h4>
            <div className="flex flex-wrap gap-2">
              {tags[category].map((tag) => {
                const isActive = filters.get(category)?.has(tag.id) || false;
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleFilter(category, tag.id)}
                    className={`transition-opacity ${isActive ? '' : 'opacity-50 hover:opacity-75'}`}
                  >
                    <TagPill tagId={tag.id} category={category} highlight={isActive} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Character Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {t('roster.characterSelection')}
          <span className="ml-2 text-sm text-gray-500">
            ({ownedCharacterIds.length} / {characters.length})
          </span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCharacters.map((character) => {
            const isOwned = ownedCharacterIds.includes(character.id);
            return (
              <button
                key={character.id}
                onClick={() => toggleCharacterOwnership(character.id)}
                className="transition-transform hover:scale-105"
              >
                <CharacterAvatar character={character} dimmed={!isOwned} />
              </button>
            );
          })}
        </div>

        {filteredCharacters.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            {t('roster.noMatchingCharacters')}
          </p>
        )}
      </div>
    </div>
  );
}
