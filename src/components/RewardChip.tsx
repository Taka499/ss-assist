import type { Reward } from '../types';
import { getItemById } from '../lib/data';

interface RewardChipProps {
  reward: Reward;
}

export function RewardChip({ reward }: RewardChipProps) {
  const { itemId, amount } = reward;

  // Format amount
  const formattedAmount =
    amount.min === amount.max
      ? amount.min.toLocaleString()
      : `${amount.min.toLocaleString()}~${amount.max.toLocaleString()}`;

  // Get item data to access icon
  const item = getItemById(itemId);
  const iconPath = item?.icon;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
      {iconPath ? (
        <img
          src={`/${iconPath}`}
          alt={item?.name.ja || itemId}
          className="w-4 h-4 object-contain"
        />
      ) : (
        <span className="text-base">🎁</span>
      )}
      <span className="font-medium">{formattedAmount}</span>
    </span>
  );
}
