import { useEffect } from 'react';
import { loadData, isDataLoaded, getMissionById } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAppStore } from '../store/useAppStore';

interface ResultsProps {
  onNavigate: (page: string) => void;
}

export function Results({ onNavigate }: ResultsProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { selectedMissionIds, ownedCharacterIds, clearOwnedCharacters, clearLevels, clearSelectedMissions } = useAppStore();

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

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          {lang === 'ja' ? '選択情報' :
            lang === 'zh-Hans' ? '选择信息' : '選擇信息'}
        </h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">
              {lang === 'ja' ? '所持キャラクター: ' :
                lang === 'zh-Hans' ? '拥有角色: ' : '擁有角色: '}
            </span>
            {ownedCharacterIds.length}
            {lang === 'ja' ? '人' : lang === 'zh-Hans' ? '个' : '個'}
          </p>
          <p>
            <span className="font-medium">
              {lang === 'ja' ? '選択した依頼: ' :
                lang === 'zh-Hans' ? '选择的委托: ' : '選擇的委託: '}
            </span>
            {selectedMissionIds.length}
            {lang === 'ja' ? '件' : lang === 'zh-Hans' ? '个' : '個'}
          </p>
        </div>
      </div>

      {/* Mission Results */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">
          {lang === 'ja' ? '選択した依頼' :
            lang === 'zh-Hans' ? '已选择的委托' : '已選擇的委託'}
        </h2>
        {selectedMissionIds.map((missionId) => {
          const mission = getMissionById(missionId);
          if (!mission) return null;

          return (
            <div key={missionId} className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">
                {mission.name[lang] || mission.name.ja}
              </h3>
              <p className="text-sm text-gray-600">
                {lang === 'ja' ? `必要レベル: Lv${mission.requiredLevel}` :
                  lang === 'zh-Hans' ? `所需等级: Lv${mission.requiredLevel}` :
                    `所需等級: Lv${mission.requiredLevel}`}
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500 text-center">
                  {lang === 'ja' ? '組み合わせ分析機能は現在開発中です' :
                    lang === 'zh-Hans' ? '组合分析功能正在开发中' : '組合分析功能正在開發中'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
