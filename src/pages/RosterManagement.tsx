import { useEffect, useState, useRef } from 'react';
import { loadData, isDataLoaded } from '../lib/data';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import { useAppStore } from '../store/useAppStore';
import { RosterSelector } from '../components/RosterSelector';

interface RosterManagementProps {
  onNavigate: (page: string) => void;
}

export function RosterManagement({ onNavigate }: RosterManagementProps) {
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);
  const ownedCharacterIds = useAppStore((state) => state.ownedCharacterIds);
  const clearOwnedCharacters = useAppStore((state) => state.clearOwnedCharacters);
  const clearOwnedCharactersKeepLevels = useAppStore((state) => state.clearOwnedCharactersKeepLevels);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDataLoaded()) {
      loadData().catch(console.error);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

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

  return (
    <div className="space-y-6">
      {/* Sticky header with navigation */}
      <div className="sticky top-16 z-40 bg-white pb-4 border-b border-gray-200 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {t('roster.title')}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('roster.selected', { count: ownedCharacterIds.length })}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Split button: Clear (keep levels) action + dropdown */}
            <div className="relative flex" ref={dropdownRef}>
              {/* Main clear button (keep levels) */}
              <button
                onClick={clearOwnedCharactersKeepLevels}
                disabled={ownedCharacterIds.length === 0}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-l-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('buttons.clear')}
              </button>

              {/* Dropdown toggle button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={ownedCharacterIds.length === 0}
                className="px-2 py-2 bg-gray-100 text-gray-700 rounded-r-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l border-gray-300"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <button
                    onClick={() => {
                      clearOwnedCharacters();
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {t('buttons.clearAll')}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('levels')}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {t('buttons.next')}
            </button>
          </div>
        </div>
      </div>

      <RosterSelector />
    </div>
  );
}
