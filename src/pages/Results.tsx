import { useEffect, useState, useCallback } from 'react';
import { loadData, isDataLoaded, getMissionById, getCharacters, getBitmaskLookup } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { useAppStore } from '../store/useAppStore';
import { findBestMissionAssignment } from '../lib/combos';
import { MissionAssignmentCard } from '../components/MissionAssignmentCard';
import { TrainingRecommendationList } from '../components/TrainingRecommendationList';
import { analytics } from '../lib/analytics';
import type { Mission, MultiMissionAssignmentResult, MissionAssignment } from '../types';

interface ResultsProps {
  onNavigate: (page: string) => void;
}

export function Results({ onNavigate }: ResultsProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);
  const { selectedMissionIds, ownedCharacterIds, characterLevels } = useAppStore();

  const [assignmentResult, setAssignmentResult] = useState<MultiMissionAssignmentResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  const analyzeResults = useCallback(() => {
    setIsAnalyzing(true);

    try {
      const bitmaskLookup = getBitmaskLookup();
      const allCharacters = getCharacters();

      // Get owned characters
      const ownedCharacters = allCharacters.filter((char) =>
        ownedCharacterIds.includes(char.id)
      );

      // Get selected missions
      const selectedMissions = selectedMissionIds
        .map(id => getMissionById(id))
        .filter((m): m is Mission => m !== null);

      // Find best disjoint mission assignment
      const result = findBestMissionAssignment(
        selectedMissions,
        ownedCharacters,
        characterLevels,
        bitmaskLookup
      );

      setAssignmentResult(result);

      // Track roster composition (which characters users actually use)
      analytics.trackRosterComposition(ownedCharacterIds);
    } catch (error) {
      console.error('Error analyzing results:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedMissionIds, ownedCharacterIds, characterLevels]);

  useEffect(() => {
    if (!isDataLoaded()) {
      loadData().catch(console.error);
      return;
    }

    // Perform analysis when data is loaded and selections exist
    if (selectedMissionIds.length > 0) {
      analyzeResults();
    } else {
      setIsAnalyzing(false);
    }
  }, [selectedMissionIds, ownedCharacterIds, characterLevels, analyzeResults]);


  if (!isDataLoaded()) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (selectedMissionIds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {t('missions.noMissions')}
        </p>
        <button
          onClick={() => onNavigate('missions')}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {t('missions.goToMissions')}
        </button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">
          {t('results.analyzing')}
        </p>
      </div>
    );
  }

  const handleReanalyze = () => {
    analyzeResults();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {t('results.title')}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('missions')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            {t('buttons.back')}
          </button>
          <button
            onClick={handleReanalyze}
            className="px-6 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            {t('buttons.reAnalyze')}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {assignmentResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3 text-blue-900">
            {t('results.summary')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600">
                {t('results.assigned')}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {assignmentResult.stats.missionsAssigned} / {assignmentResult.stats.missionsTotal}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {t('results.missionValue')}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {assignmentResult.stats.totalMissionValue}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {t('results.charactersUsed')}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {assignmentResult.stats.totalCharactersUsed}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {t('results.totalRarity')}
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {assignmentResult.stats.totalRarity}★
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mission Assignments */}
      {assignmentResult && assignmentResult.assignments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {t('results.assignmentsTitle')}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('results.assignmentsDescription')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignmentResult.assignments.map((assignment: MissionAssignment) => {
              const mission = getMissionById(assignment.missionId);
              if (!mission) return null;

              return (
                <MissionAssignmentCard
                  key={assignment.missionId}
                  assignment={assignment}
                  mission={mission}
                  characterLevels={characterLevels}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Training Recommendations */}
      {assignmentResult && assignmentResult.trainingRecommendations && assignmentResult.trainingRecommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">
            {t('results.trainingTitle')}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('results.trainingDescription')}
          </p>
          <TrainingRecommendationList recommendations={assignmentResult.trainingRecommendations} />
        </div>
      )}

      {/* No Results */}
      {assignmentResult && assignmentResult.assignments.length === 0 && (
        <div className="bg-white border border-amber-200 rounded-lg p-6">
          <p className="text-amber-600 mb-3 font-medium">
            ⚠️ {t('results.noAssignments')}
          </p>
          <p className="text-sm text-gray-600">
            {t('results.noAssignmentsHint')}
          </p>
        </div>
      )}
    </div>
  );
}
