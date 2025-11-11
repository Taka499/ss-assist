import type { Reward } from '../types';

interface RewardChipProps {
  reward: Reward;
}

export function RewardChip({ reward }: RewardChipProps) {
  const { amount, category } = reward;

  // Format amount
  const formattedAmount =
    amount.min === amount.max
      ? amount.min.toLocaleString()
      : `${amount.min.toLocaleString()}~${amount.max.toLocaleString()}`;

  // Icon based on category
  const iconMap: Record<string, string> = {
    currency: '💰',
    prize_egg: '🥚',
    exp_character: '📚',
    exp_disc: '💿',
    tier_character: '⭐',
    tier_disc: '🔷',
    skill_cartridge: '🎯',
    skill_piece: '🧩',
  };

  const icon = category ? iconMap[category] || '🎁' : '🎁';

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
      <span className="text-base">{icon}</span>
      <span className="font-medium">{formattedAmount}</span>
    </span>
  );
}
