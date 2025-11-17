import type { Reward } from '../types';
import { getItemById } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';

interface RewardChipProps {
  reward: Reward;
}

export function RewardChip({ reward }: RewardChipProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { itemId, amount } = reward;

  // Format amount
  const formattedAmount =
    amount.min === amount.max
      ? amount.min.toLocaleString()
      : `${amount.min.toLocaleString()}~${amount.max.toLocaleString()}`;

  // Get item data to access icon
  const item = getItemById(itemId);

  // Prepend Vite base URL to icon path for correct asset resolution
  const iconUrl = item?.icon ? `${import.meta.env.BASE_URL}${item.icon}` : '';

  // Get localized item name for tooltip
  const itemName = item ? (item.name[lang] || item.name.ja) : itemId;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={itemName}
          title={itemName}
          className="w-4 h-4 object-contain cursor-help"
        />
      ) : (
        <span className="text-base" title={itemName}>🎁</span>
      )}
      <span className="font-medium">{formattedAmount}</span>
    </span>
  );
}
