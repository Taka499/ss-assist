import { useEffect, useState } from 'react';
import { loadData, isDataLoaded, getMissionById, getCharacters, getBitmaskLookup } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAppStore } from '../store/useAppStore';
import { findBestMissionAssignment } from '../lib/combos';
import { MissionAssignmentCard } from '../components/MissionAssignmentCard';
import { TrainingRecommendationList } from '../components/TrainingRecommendationList';
import type { Mission, MultiMissionAssignmentResult, MissionAssignment } from '../types';

interface ResultsProps {
  onNavigate: (page: string) => void;
}

export function Results({ onNavigate }: ResultsProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { selectedMissionIds, ownedCharacterIds, characterLevels, clearOwnedCharacters, clearLevels, clearSelectedMissions } = useAppStore();

  const [assignmentResult, setAssignmentResult] = useState<MultiMissionAssignmentResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

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
  }, [selectedMissionIds, ownedCharacterIds, characterLevels]);

  const analyzeResults = () => {
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
    } catch (error) {
      console.error('Error analyzing results:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };


  if (!isDataLoaded()) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">
          {lang === 'ja' ? '読み込み中...' : lang === 'zh-Hans' ? '加载中...' : '載入中...'}
        </p>
      </div>
    );
  }

  if (selectedMissionIds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {lang === 'ja' ? '依頼を選択してください' :
            lang === 'zh-Hans' ? '请先选择委托' : '請先選擇委託'}
        </p>
        <button
          onClick={() => onNavigate('missions')}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {lang === 'ja' ? '依頼選択へ' :
            lang === 'zh-Hans' ? '前往选择委托' : '前往選擇委託'}
        </button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">
          {lang === 'ja' ? '分析中...' : lang === 'zh-Hans' ? '分析中...' : '分析中...'}
        </p>
      </div>
    );
  }

  const handleReset = () => {
    clearOwnedCharacters();
    clearLevels();
    clearSelectedMissions();
    onNavigate('home');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {lang === 'ja' ? '分析結果' :
            lang === 'zh-Hans' ? '分析结果' : '分析結果'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('missions')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            {lang === 'ja' ? '戻る' : lang === 'zh-Hans' ? '返回' : '返回'}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            {lang === 'ja' ? 'リセット' : lang === 'zh-Hans' ? '重置' : '重置'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {assignmentResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3 text-blue-900">
            {lang === 'ja' ? '📊 概要' : lang === 'zh-Hans' ? '📊 概要' : '📊 概要'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600">
                {lang === 'ja' ? '割り当て済み' : lang === 'zh-Hans' ? '已分配' : '已分配'}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {assignmentResult.stats.missionsAssigned} / {assignmentResult.stats.missionsTotal}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {lang === 'ja' ? 'ミッション価値' : lang === 'zh-Hans' ? '任务价值' : '任務價值'}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {assignmentResult.stats.totalMissionValue}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {lang === 'ja' ? '使用キャラ数' : lang === 'zh-Hans' ? '使用角色数' : '使用角色數'}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {assignmentResult.stats.totalCharactersUsed}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {lang === 'ja' ? '合計レア度' : lang === 'zh-Hans' ? '总稀有度' : '總稀有度'}
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
            {lang === 'ja' ? '🎯 ミッション割り当て' :
              lang === 'zh-Hans' ? '🎯 任务分配' : '🎯 任務分配'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {lang === 'ja' ? '各ミッションに別々のチームが割り当てられています（キャラの重複なし）' :
              lang === 'zh-Hans' ? '每个任务分配独立队伍（无角色重复）' :
                '每個任務分配獨立隊伍（無角色重複）'}
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
      {assignmentResult && assignmentResult.trainingRecommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">
            {lang === 'ja' ? '💪 育成推奨' :
              lang === 'zh-Hans' ? '💪 培养推荐' : '💪 培養推薦'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {lang === 'ja' ? '以下のキャラを育成すると、さらにミッションを解放できます' :
              lang === 'zh-Hans' ? '培养以下角色可解锁更多任务' :
                '培養以下角色可解鎖更多任務'}
          </p>
          <TrainingRecommendationList recommendations={assignmentResult.trainingRecommendations.slice(0, 10)} />
        </div>
      )}

      {/* No Results */}
      {assignmentResult && assignmentResult.assignments.length === 0 && (
        <div className="bg-white border border-amber-200 rounded-lg p-6">
          <p className="text-amber-600 mb-3 font-medium">
            ⚠️ {lang === 'ja' ? '現在の編成では依頼を割り当てられません' :
              lang === 'zh-Hans' ? '当前编队无法分配任务' :
                '當前編隊無法分配任務'}
          </p>
          <p className="text-sm text-gray-600">
            {lang === 'ja' ? 'キャラクターを追加するか、レベルを上げてください' :
              lang === 'zh-Hans' ? '请添加角色或提升等级' :
                '請添加角色或提升等級'}
          </p>
        </div>
      )}
    </div>
  );
}
