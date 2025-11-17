import { useEffect } from 'react';
import { loadData, isDataLoaded } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAppStore } from '../store/useAppStore';
import { RosterSelector } from '../components/RosterSelector';

interface RosterManagementProps {
  onNavigate: (page: string) => void;
}

export function RosterManagement({ onNavigate }: RosterManagementProps) {
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

  return (
    <div className="space-y-6">
      {/* Sticky header with navigation */}
      <div className="sticky top-0 z-10 bg-white pb-4 border-b border-gray-200 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {lang === 'ja' ? 'キャラクター選択' :
                lang === 'zh-Hans' ? '选择角色' : '選擇角色'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {lang === 'ja' ? `選択中: ${ownedCharacterIds.length}人` :
                lang === 'zh-Hans' ? `已选择: ${ownedCharacterIds.length}个` :
                  `已選擇: ${ownedCharacterIds.length}個`}
            </p>
          </div>
          <button
            onClick={() => onNavigate('levels')}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {lang === 'ja' ? '次へ' : lang === 'zh-Hans' ? '下一步' : '下一步'}
          </button>
        </div>
      </div>

      <RosterSelector />
    </div>
  );
}
