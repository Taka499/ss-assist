import { useEffect } from 'react';
import { loadData, isDataLoaded } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { useAppStore } from '../store/useAppStore';
import { LevelEditor } from '../components/LevelEditor';

interface LevelManagementProps {
  onNavigate: (page: string) => void;
}

export function LevelManagement({ onNavigate }: LevelManagementProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);
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
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (ownedCharacterIds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {t('levels.noCharacters')}
        </p>
        <button
          onClick={() => onNavigate('roster')}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {t('levels.goToRoster')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky header with navigation */}
      <div className="sticky top-16 z-40 bg-white pb-4 border-b border-gray-200 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {t('levels.title')}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('levels.description')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('roster')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              {t('buttons.back')}
            </button>
            <button
              onClick={() => onNavigate('missions')}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {t('buttons.next')}
            </button>
          </div>
        </div>
      </div>

      <LevelEditor />
    </div>
  );
}
