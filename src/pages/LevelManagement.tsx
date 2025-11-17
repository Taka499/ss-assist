import { useEffect } from 'react';
import { loadData, isDataLoaded } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAppStore } from '../store/useAppStore';
import { LevelEditor } from '../components/LevelEditor';

interface LevelManagementProps {
  onNavigate: (page: string) => void;
}

export function LevelManagement({ onNavigate }: LevelManagementProps) {
  const lang = useLanguageStore((state) => state.lang);
  const ownedCharacterIds = useAppStore((state) => state.ownedCharacterIds);

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

  if (ownedCharacterIds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {lang === 'ja' ? 'キャラクターを選択してください' :
            lang === 'zh-Hans' ? '请先选择角色' : '請先選擇角色'}
        </p>
        <button
          onClick={() => onNavigate('roster')}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {lang === 'ja' ? 'キャラクター選択へ' :
            lang === 'zh-Hans' ? '前往选择角色' : '前往選擇角色'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky header with navigation */}
      <div className="sticky top-0 z-10 bg-white pb-4 border-b border-gray-200 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {lang === 'ja' ? 'レベル設定' :
                lang === 'zh-Hans' ? '设置等级' : '設置等級'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {lang === 'ja' ? 'キャラクターのレベルを設定してください' :
                lang === 'zh-Hans' ? '请设置角色等级' : '請設置角色等級'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('roster')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              {lang === 'ja' ? '戻る' : lang === 'zh-Hans' ? '返回' : '返回'}
            </button>
            <button
              onClick={() => onNavigate('missions')}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {lang === 'ja' ? '次へ' : lang === 'zh-Hans' ? '下一步' : '下一步'}
            </button>
          </div>
        </div>
      </div>

      <LevelEditor />
    </div>
  );
}
