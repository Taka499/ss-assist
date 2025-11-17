import { useEffect } from 'react';
import { loadData, isDataLoaded } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAppStore } from '../store/useAppStore';
import { MissionPicker } from '../components/MissionPicker';

interface MissionSelectionProps {
  onNavigate: (page: string) => void;
}

export function MissionSelection({ onNavigate }: MissionSelectionProps) {
  const lang = useLanguageStore((state) => state.lang);
  const selectedMissionIds = useAppStore((state) => state.selectedMissionIds);
  const clearSelectedMissions = useAppStore((state) => state.clearSelectedMissions);

  useEffect(() => {
    if (!isDataLoaded()) {
      loadData().catch(console.error);
    }
  }, []);

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

  const canAnalyze = selectedMissionIds.length > 0;

  return (
    <div className="space-y-6">
      {/* Sticky header with navigation */}
      <div className="sticky top-16 z-40 bg-white pb-4 border-b border-gray-200 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {lang === 'ja' ? '依頼選択' :
                lang === 'zh-Hans' ? '选择委托' : '選擇委託'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {lang === 'ja' ? `選択中: ${selectedMissionIds.length}/4件` :
                lang === 'zh-Hans' ? `已选择: ${selectedMissionIds.length}/4个` :
                  `已選擇: ${selectedMissionIds.length}/4個`}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedMissionIds.length > 0 && (
              <button
                onClick={clearSelectedMissions}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
              >
                {lang === 'ja' ? '選択解除' : lang === 'zh-Hans' ? '清除选择' : '清除選擇'}
              </button>
            )}
            <button
              onClick={() => onNavigate('levels')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              {lang === 'ja' ? '戻る' : lang === 'zh-Hans' ? '返回' : '返回'}
            </button>
            <button
              onClick={() => onNavigate('results')}
              disabled={!canAnalyze}
              className={`px-6 py-2 rounded-md transition-colors ${canAnalyze
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {lang === 'ja' ? '分析' : lang === 'zh-Hans' ? '分析' : '分析'}
            </button>
          </div>
        </div>
      </div>

      {!canAnalyze && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            {lang === 'ja' ? '少なくとも1件の依頼を選択してください' :
              lang === 'zh-Hans' ? '请至少选择一个委托' : '請至少選擇一個委託'}
          </p>
        </div>
      )}

      <MissionPicker />
    </div>
  );
}
