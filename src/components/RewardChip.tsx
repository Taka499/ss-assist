import { useState } from 'react';
import type { Reward } from '../types';
import { getItemById } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';

interface RewardChipProps {
  reward: Reward;
}

export function RewardChip({ reward }: RewardChipProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { itemId, amount } = reward;
  const [showTooltip, setShowTooltip] = useState(false);

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
      <span
        className="relative inline-block"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={itemName}
            className="w-6 h-6 object-contain cursor-pointer"
          />
        ) : (
          <span className="text-lg cursor-pointer">🎁</span>
        )}

        {/* Custom tooltip */}
        {showTooltip && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap z-10 pointer-events-none">
            {itemName}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
          </span>
        )}
      </span>
      <span className="font-medium">{formattedAmount}</span>
    </span>
  );
}
