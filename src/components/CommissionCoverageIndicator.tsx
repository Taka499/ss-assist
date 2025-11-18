import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import type { CommissionCoverage, Commission } from '../types';

interface CommissionCoverageIndicatorProps {
  commissionCoverage: CommissionCoverage[];
  commissions: Commission[];
}

export function CommissionCoverageIndicator({ commissionCoverage, commissions }: CommissionCoverageIndicatorProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);

  return (
    <div className="flex flex-wrap gap-2">
      {commissions.map((commission) => {
        const coverage = commissionCoverage.find((mc) => mc.commissionId === commission.id);

        if (!coverage) return null;

        // Determine badge style based on coverage level
        let badgeClass = '';
        let icon = '';
        let statusText = '';

        if (!coverage.meetsLevelRequirement) {
          // Red: Level requirement not met
          badgeClass = 'bg-red-100 text-red-700 border-red-300';
          icon = '⚠️';
          statusText = t('status.levelDeficit');
        } else if (coverage.satisfiesBase && coverage.satisfiesBonus) {
          // Green: Full coverage (base + bonus)
          badgeClass = 'bg-green-100 text-green-700 border-green-300';
          icon = '✅';
          statusText = t('status.bonusAchieved');
        } else if (coverage.satisfiesBase) {
          // Blue: Base only
          badgeClass = 'bg-blue-100 text-blue-700 border-blue-300';
          icon = '✓';
          statusText = t('status.canAccept');
        } else {
          // Gray: Not satisfied
          badgeClass = 'bg-gray-100 text-gray-700 border-gray-300';
          icon = '✗';
          statusText = t('status.notSatisfied');
        }

        const commissionName = commission.name[lang] || commission.name.ja;

        return (
          <span
            key={commission.id}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${badgeClass}`}
            title={`${commissionName}: ${statusText}`}
          >
            <span>{icon}</span>
            <span className="truncate max-w-[120px]">{commissionName}</span>
          </span>
        );
      })}
    </div>
  );
}
