import { useLanguageStore } from '../store/useLanguageStore';
import type { MissionAssignment, Mission } from '../types';
import { getCharacterById } from '../lib/data';

interface MissionAssignmentCardProps {
  assignment: MissionAssignment;
  mission: Mission;
  characterLevels: Record<string, number>;
}

export function MissionAssignmentCard({ assignment, mission, characterLevels }: MissionAssignmentCardProps) {
  const lang = useLanguageStore((state) => state.lang);

  const missionName = mission.name[lang] || mission.name.ja;

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Mission Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{missionName}</h3>
          <p className="text-xs text-gray-500">
            {lang === 'ja' ? 'ミッション価値' : lang === 'zh-Hans' ? '任务价值' : '任務價值'}: {assignment.missionValue}
            {' • '}
            {lang === 'ja' ? '必要レベル' : lang === 'zh-Hans' ? '所需等级' : '所需等級'}: {mission.requiredLevel}
          </p>
        </div>
      </div>

      {assignment.team ? (
        <div>
          {/* Character Avatars */}
          <div className="flex justify-center gap-4 mb-3">
            {assignment.team.characterIds.map(charId => {
              const char = getCharacterById(charId);
              if (!char) return null;

              const level = characterLevels[charId] || 1;
              const dimmed = level < mission.requiredLevel;
              const levelDeficit = dimmed ? mission.requiredLevel - level : 0;

              return (
                <div key={charId} className="text-center relative">
                  <img
                    src={char.icon}
                    alt={char.name[lang] || char.name.ja}
                    className={`w-16 h-16 rounded-full border-2 ${
                      dimmed
                        ? 'border-red-300 opacity-60'
                        : 'border-green-300'
                    }`}
                  />
                  {dimmed && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      !
                    </div>
                  )}
                  <p className="text-xs mt-1 text-gray-700">
                    {char.name[lang] || char.name.ja}
                  </p>
                  <p className={`text-xs ${dimmed ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    Lv{level}
                    {dimmed && (
                      <span className="block text-red-600">
                        (+{levelDeficit})
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Status Badges */}
          <div className="flex gap-2 justify-center">
            {assignment.team.satisfiesBonus ? (
              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                ✅ {lang === 'ja' ? '基本 + 追加報酬' : lang === 'zh-Hans' ? '基础 + 额外奖励' : '基礎 + 額外獎勵'}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                ✓ {lang === 'ja' ? '基本条件のみ' : lang === 'zh-Hans' ? '仅基础条件' : '僅基礎條件'}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center py-2 mb-3">
            <p className="text-amber-600 font-medium">
              ⚠️ {lang === 'ja' ? '割り当て不可' : lang === 'zh-Hans' ? '无法分配' : '無法分配'}
            </p>
          </div>

          {/* Show blocked team if available */}
          {assignment.blockedTeam ? (
            <div>
              <p className="text-xs text-gray-600 mb-2 text-center">
                {lang === 'ja' ? '育成が必要なキャラ:' : lang === 'zh-Hans' ? '需要培养的角色:' : '需要培養的角色:'}
              </p>
              <div className="flex justify-center gap-4 mb-2">
                {assignment.blockedTeam.characterIds.map(charId => {
                  const char = getCharacterById(charId);
                  if (!char) return null;

                  const level = characterLevels[charId] || 1;
                  const levelDeficit = assignment.blockedTeam!.levelDeficits[charId] || 0;
                  const needsTraining = levelDeficit > 0;

                  return (
                    <div key={charId} className="text-center relative">
                      <img
                        src={char.icon}
                        alt={char.name[lang] || char.name.ja}
                        className={`w-16 h-16 rounded-full border-2 ${
                          needsTraining
                            ? 'border-amber-300 opacity-60'
                            : 'border-gray-300'
                        }`}
                      />
                      {needsTraining && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          !
                        </div>
                      )}
                      <p className="text-xs mt-1 text-gray-700">
                        {char.name[lang] || char.name.ja}
                      </p>
                      <p className={`text-xs ${needsTraining ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                        Lv{level}
                        {needsTraining && (
                          <span className="block text-amber-600">
                            (+{levelDeficit})
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-center text-gray-500">
                {lang === 'ja' ? 'レベルを上げると割り当て可能になります' :
                  lang === 'zh-Hans' ? '提升等级后可分配' :
                    '提升等級後可分配'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-1 text-center">
              {lang === 'ja' ? 'キャラクターが不足しています' : lang === 'zh-Hans' ? '角色不足' : '角色不足'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
