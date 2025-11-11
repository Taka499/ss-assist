import { useAppStore } from '../store/useAppStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { getMissions } from '../lib/data';
import { TagPill } from './TagPill';
import { RewardChip } from './RewardChip';

const MAX_MISSIONS = 4;

export function MissionPicker() {
  const lang = useLanguageStore((state) => state.lang);
  const { selectedMissionIds, toggleMissionSelection } = useAppStore();

  const missions = getMissions();

  const handleMissionClick = (missionId: string) => {
    const isSelected = selectedMissionIds.includes(missionId);
    const isAtLimit = selectedMissionIds.length >= MAX_MISSIONS;

    if (!isSelected && isAtLimit) {
      alert(
        lang === 'ja' ? '最大4件まで選択できます' :
          lang === 'zh-Hans' ? '最多只能选择4个委托' : '最多只能選擇4個委託'
      );
      return;
    }

    toggleMissionSelection(missionId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {lang === 'ja' ? '依頼選択' : lang === 'zh-Hans' ? '选择委托' : '選擇委託'}
        </h3>
        <span className="text-sm text-gray-500">
          {selectedMissionIds.length} / {MAX_MISSIONS}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.map((mission) => {
          const isSelected = selectedMissionIds.includes(mission.id);
          const isDisabled = !isSelected && selectedMissionIds.length >= MAX_MISSIONS;

          return (
            <button
              key={mission.id}
              onClick={() => handleMissionClick(mission.id)}
              disabled={isDisabled}
              className={`text-left p-4 rounded-lg border-2 transition-all ${isSelected
                ? 'border-blue-500 bg-blue-50'
                : isDisabled
                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
            >
              {/* Mission Name */}
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{mission.name[lang] || mission.name.ja}</h4>
                {isSelected && (
                  <span className="text-blue-500 text-xl">✓</span>
                )}
              </div>

              {/* Required Level */}
              <div className="text-sm text-gray-600 mb-2">
                {lang === 'ja' ? '必要レベル' : lang === 'zh-Hans' ? '所需等级' : '所需等級'}: Lv{mission.requiredLevel}
              </div>

              {/* Base Conditions */}
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-1">
                  {lang === 'ja' ? '受注条件' : lang === 'zh-Hans' ? '接受条件' : '接受條件'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {mission.baseConditions.map((cond, idx) => (
                    <div key={idx} className="flex flex-wrap gap-1">
                      {cond.anyOf.map((tagId) => (
                        <TagPill key={tagId} tagId={tagId} category={cond.category} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bonus Conditions */}
              {mission.bonusConditions && mission.bonusConditions.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">
                    {lang === 'ja' ? '追加報酬条件' : lang === 'zh-Hans' ? '额外奖励条件' : '額外獎勵條件'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mission.bonusConditions.map((cond, idx) => (
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
                <div className="text-xs text-gray-500 mb-1">
                  {lang === 'ja' ? '報酬' : lang === 'zh-Hans' ? '奖励' : '獎勵'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {mission.durations[0]?.rewards.slice(0, 3).map((reward, idx) => (
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
