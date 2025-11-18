import { useAppStore } from '../store/useAppStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { getCommissions } from '../lib/data';
import { TagPill } from './TagPill';
import { RewardChip } from './RewardChip';

const MAX_COMMISSIONS = 4;

export function CommissionPicker() {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);
  const { selectedCommissionIds, toggleCommissionSelection } = useAppStore();

  const commissions = getCommissions();

  const handleCommissionClick = (commissionId: string) => {
    const isSelected = selectedCommissionIds.includes(commissionId);
    const isAtLimit = selectedCommissionIds.length >= MAX_COMMISSIONS;

    if (!isSelected && isAtLimit) {
      alert(t('missions.maxSelectAlert'));
      return;
    }

    toggleCommissionSelection(commissionId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {t('missions.title')}
        </h3>
        <span className="text-sm text-gray-500">
          {selectedCommissionIds.length} / {MAX_COMMISSIONS}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {commissions.map((commission) => {
          const isSelected = selectedCommissionIds.includes(commission.id);
          const isDisabled = !isSelected && selectedCommissionIds.length >= MAX_COMMISSIONS;

          return (
            <button
              key={commission.id}
              onClick={() => handleCommissionClick(commission.id)}
              disabled={isDisabled}
              className={`text-left p-3 rounded-lg border-2 transition-all ${isSelected
                ? 'border-blue-500 bg-blue-50'
                : isDisabled
                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
            >
              {/* Commission Name */}
              <div className="flex justify-between items-start mb-1.5">
                <h4 className="font-semibold text-sm">{commission.name[lang] || commission.name.ja}</h4>
                {isSelected && (
                  <span className="text-blue-500 text-lg ml-1">✓</span>
                )}
              </div>

              {/* Required Level */}
              <div className="text-xs text-gray-600 mb-1.5">
                Lv{commission.requiredLevel}
              </div>

              {/* Base Conditions */}
              <div className="mb-1.5">
                <div className="text-xs text-gray-500 mb-0.5">
                  {t('missions.baseConditions')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {commission.baseConditions.map((cond, idx) => (
                    <div key={idx} className="flex flex-wrap gap-1">
                      {cond.anyOf.map((tagId) => (
                        <TagPill key={tagId} tagId={tagId} category={cond.category} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bonus Conditions */}
              {commission.bonusConditions && commission.bonusConditions.length > 0 && (
                <div className="mb-1.5">
                  <div className="text-xs text-gray-500 mb-0.5">
                    {t('missions.bonusConditions')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {commission.bonusConditions.map((cond, idx) => (
                      <div key={idx} className="flex flex-wrap gap-1">
                        {cond.anyOf.map((tagId) => (
                          <TagPill key={tagId} tagId={tagId} category={cond.category} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewards (show first duration only for preview) */}
              <div>
                <div className="text-xs text-gray-500 mb-0.5">
                  {t('missions.rewards')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {commission.durations[0]?.rewards.slice(0, 3).map((reward, idx) => (
                    <RewardChip key={idx} reward={reward} />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
