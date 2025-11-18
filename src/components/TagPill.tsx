import { useLanguageStore } from '../store/useLanguageStore';
import { getTagTranslation } from '../../i18n';
import { getTags } from '../lib/data';
import type { Category } from '../types';

interface TagPillProps {
  tagId: string;
  category: Category;
  highlight?: boolean;
}

export function TagPill({ tagId, category, highlight = false }: TagPillProps) {
  const lang = useLanguageStore((state) => state.lang);
  const tags = getTags();

  const tagEntry = tags[category]?.find((t) => t.id === tagId);
  if (!tagEntry) {
    return <span className="text-red-500">Unknown tag: {tagId}</span>;
  }

  const label = getTagTranslation(lang, category, tagId, tagEntry.ja);

  // Determine color classes based on category
  let colorClass: string;

  if (category === 'rarity') {
    // Special handling for rarity: purple for 5, gold for 4
    const rarityColors: Record<string, string> = {
      'rarity-005': highlight ? 'bg-purple-200 text-purple-800' : 'bg-purple-100 text-purple-700',
      'rarity-004': highlight ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-100 text-yellow-700',
    };
    colorClass = rarityColors[tagId] || (highlight ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700');
  } else {
    // Standard category colors
    const colorClasses: Record<Category, string> = {
      role: highlight ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700',
      style: highlight ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700',
      faction: highlight ? 'bg-purple-200 text-purple-800' : 'bg-purple-100 text-purple-700',
      element: highlight ? 'bg-orange-200 text-orange-800' : 'bg-orange-100 text-orange-700',
      rarity: highlight ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700', // Fallback
    };
    colorClass = colorClasses[category];
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
