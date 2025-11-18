import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import type { CommissionAssignment, Commission } from '../types';
import { getCharacterById, resolveTagName } from '../lib/data';
import { analyzeConditionSatisfaction, getMatchingTagForCharacter } from '../lib/requirementMatching';

interface CommissionAssignmentCardProps {
  assignment: CommissionAssignment;
  commission: Commission;
  characterLevels: Record<string, number>;
}

export function CommissionAssignmentCard({ assignment, commission, characterLevels }: CommissionAssignmentCardProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);

  const commissionName = commission.name[lang] || commission.name.ja;

  // Get team characters for requirement analysis
  const teamCharacters = assignment.team
    ? assignment.team.characterIds.map(id => getCharacterById(id)).filter((char): char is import('../types').Character => char !== undefined)
    : assignment.blockedTeam
    ? assignment.blockedTeam.characterIds.map(id => getCharacterById(id)).filter((char): char is import('../types').Character => char !== undefined)
    : [];

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Commission Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{commissionName}</h3>
          <p className="text-xs text-gray-500">
            {t('results.missionValue')}: {assignment.commissionValue}
            {' • '}
            {t('missions.requiredLevel')}: {commission.requiredLevel}
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
              const dimmed = level < commission.requiredLevel;
              const levelDeficit = dimmed ? commission.requiredLevel - level : 0;

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

          {/* Requirements Display */}
          {teamCharacters.length > 0 && (
            <div className="mb-3 bg-gray-50 rounded-md p-3 text-xs">
              {/* Base Conditions */}
              <div className="mb-2">
                <p className="font-semibold text-gray-700 mb-1">Base Requirements:</p>
                {analyzeConditionSatisfaction(teamCharacters, commission.baseConditions).map((condSat, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-1">
                    <span className="text-gray-600">
                      {condSat.requiredTagIds.map(tagId => resolveTagName(tagId, lang)).join(' / ')}:
                    </span>
                    {condSat.satisfyingCharacterIds.length > 0 ? (
                      <div className="flex gap-1">
                        {condSat.satisfyingCharacterIds.map(charId => {
                          const char = getCharacterById(charId);
                          if (!char) return null;
                          const matchingTag = getMatchingTagForCharacter(char, condSat.condition);
                          return (
                            <span key={charId} className="inline-flex flex-col items-center px-2 py-1 rounded bg-green-100 text-green-800 font-medium">
                              <span>{char.name[lang] || char.name.ja}</span>
                              {matchingTag && (
                                <span className="text-[10px] text-green-600">({resolveTagName(matchingTag, lang)})</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-red-600">✗ Not satisfied</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Bonus Conditions */}
              {commission.bonusConditions && commission.bonusConditions.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Bonus Requirements:</p>
                  {analyzeConditionSatisfaction(teamCharacters, commission.bonusConditions).map((condSat, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <span className={condSat.satisfied ? 'text-gray-600' : 'text-gray-400'}>
                        {condSat.requiredTagIds.map(tagId => resolveTagName(tagId, lang)).join(' / ')}:
                      </span>
                      {condSat.satisfyingCharacterIds.length > 0 ? (
                        <div className="flex gap-1 items-center">
                          {condSat.satisfyingCharacterIds.map(charId => {
                            const char = getCharacterById(charId);
                            if (!char) return null;
                            const matchingTag = getMatchingTagForCharacter(char, condSat.condition);
                            return (
                              <span key={charId} className="inline-flex flex-col items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-medium">
                                <span>{char.name[lang] || char.name.ja}</span>
                                {matchingTag && (
                                  <span className="text-[10px] text-yellow-600">({resolveTagName(matchingTag, lang)})</span>
                                )}
                              </span>
                            );
                          })}
                          {!condSat.satisfied && (() => {
                            // Calculate how many more characters are needed per tag
                            const requiredCounts = new Map<string, number>();
                            for (const tagId of condSat.requiredTagIds) {
                              requiredCounts.set(tagId, (requiredCounts.get(tagId) || 0) + 1);
                            }

                            const placeholders: JSX.Element[] = [];
                            for (const [tagId, minCount] of requiredCounts) {
                              let actualCount = 0;
                              for (const character of teamCharacters) {
                                const charTags = character.tags[condSat.condition.category];
                                if (charTags && charTags.includes(tagId)) {
                                  actualCount++;
                                }
                              }

                              const deficit = minCount - actualCount;
                              if (deficit > 0) {
                                // Render dimmed placeholder badges for each missing character of this tag
                                const tagName = resolveTagName(tagId, lang);
                                for (let i = 0; i < deficit; i++) {
                                  placeholders.push(
                                    <span key={`missing-${tagId}-${i}`} className="inline-flex flex-col items-center px-2 py-1 rounded bg-gray-100 text-gray-400 font-medium opacity-50 border border-dashed border-gray-300">
                                      <span>?</span>
                                      <span className="text-[10px]">({tagName})</span>
                                    </span>
                                  );
                                }
                              }
                            }

                            return placeholders;
                          })()}
                        </div>
                      ) : (
                        <span className="text-gray-400">✗ Not satisfied</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status Badges */}
          <div className="flex gap-2 justify-center">
            {assignment.team.satisfiesBonus ? (
              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                ✅ {t('status.basePlusBonus')}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                ✓ {t('status.baseOnly')}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center py-2 mb-3">
            <p className="text-amber-600 font-medium">
              ⚠️ {t('status.cannotAssign')}
            </p>
          </div>

          {/* Show blocked team if available */}
          {assignment.blockedTeam ? (
            <div>
              <p className="text-xs text-gray-600 mb-2 text-center">
                {t('missions.charactersNeedTraining')}
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

              {/* Requirements Display for Blocked Team */}
              {teamCharacters.length > 0 && (
                <div className="mb-2 bg-gray-50 rounded-md p-3 text-xs">
                  {/* Base Conditions */}
                  <div className="mb-2">
                    <p className="font-semibold text-gray-700 mb-1">Base Requirements:</p>
                    {analyzeConditionSatisfaction(teamCharacters, commission.baseConditions).map((condSat, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <span className="text-gray-600">
                          {condSat.requiredTagIds.map(tagId => resolveTagName(tagId, lang)).join(' / ')}:
                        </span>
                        {condSat.satisfyingCharacterIds.length > 0 ? (
                          <div className="flex gap-1">
                            {condSat.satisfyingCharacterIds.map(charId => {
                              const char = getCharacterById(charId);
                              if (!char) return null;
                              const matchingTag = getMatchingTagForCharacter(char, condSat.condition);
                              return (
                                <span key={charId} className="inline-flex flex-col items-center px-2 py-1 rounded bg-green-100 text-green-800 font-medium">
                                  <span>{char.name[lang] || char.name.ja}</span>
                                  {matchingTag && (
                                    <span className="text-[10px] text-green-600">({resolveTagName(matchingTag, lang)})</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-red-600">✗ Not satisfied</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bonus Conditions */}
                  {commission.bonusConditions && commission.bonusConditions.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Bonus Requirements:</p>
                      {analyzeConditionSatisfaction(teamCharacters, commission.bonusConditions).map((condSat, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-1">
                          <span className={condSat.satisfied ? 'text-gray-600' : 'text-gray-400'}>
                            {condSat.requiredTagIds.map(tagId => resolveTagName(tagId, lang)).join(' / ')}:
                          </span>
                          {condSat.satisfyingCharacterIds.length > 0 ? (
                            <div className="flex gap-1 items-center">
                              {condSat.satisfyingCharacterIds.map(charId => {
                                const char = getCharacterById(charId);
                                if (!char) return null;
                                const matchingTag = getMatchingTagForCharacter(char, condSat.condition);
                                return (
                                  <span key={charId} className="inline-flex flex-col items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-medium">
                                    <span>{char.name[lang] || char.name.ja}</span>
                                    {matchingTag && (
                                      <span className="text-[10px] text-yellow-600">({resolveTagName(matchingTag, lang)})</span>
                                    )}
                                  </span>
                                );
                              })}
                              {!condSat.satisfied && (() => {
                                // Calculate how many more characters are needed per tag
                                const requiredCounts = new Map<string, number>();
                                for (const tagId of condSat.requiredTagIds) {
                                  requiredCounts.set(tagId, (requiredCounts.get(tagId) || 0) + 1);
                                }

                                const placeholders: JSX.Element[] = [];
                                for (const [tagId, minCount] of requiredCounts) {
                                  let actualCount = 0;
                                  for (const character of teamCharacters) {
                                    const charTags = character.tags[condSat.condition.category];
                                    if (charTags && charTags.includes(tagId)) {
                                      actualCount++;
                                    }
                                  }

                                  const deficit = minCount - actualCount;
                                  if (deficit > 0) {
                                    // Render dimmed placeholder badges for each missing character of this tag
                                    const tagName = resolveTagName(tagId, lang);
                                    for (let i = 0; i < deficit; i++) {
                                      placeholders.push(
                                        <span key={`missing-${tagId}-${i}`} className="inline-flex flex-col items-center px-2 py-1 rounded bg-gray-100 text-gray-400 font-medium opacity-50 border border-dashed border-gray-300">
                                          <span>?</span>
                                          <span className="text-[10px]">({tagName})</span>
                                        </span>
                                      );
                                    }
                                  }
                                }

                                return placeholders;
                              })()}
                            </div>
                          ) : (
                            <span className="text-gray-400">✗ Not satisfied</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-center text-gray-500">
                {t('missions.canAssignAfterLeveling')}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-1 text-center">
              {t('missions.notEnoughCharacters')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
