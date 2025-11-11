import { useEffect } from 'react';
import { loadData, isDataLoaded } from '../lib/data';
import { RosterSelector } from '../components/RosterSelector';
import { LevelEditor } from '../components/LevelEditor';
import { MissionPicker } from '../components/MissionPicker';
import { useLanguageStore } from '../store/useLanguageStore';

export function FeatureTest() {
  const { lang, setLanguage } = useLanguageStore();

  useEffect(() => {
    if (!isDataLoaded()) {
      loadData().catch(console.error);
    }
  }, []);

  return (
    <div className="container mx-auto p-8 space-y-12">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Feature Component Test</h1>

        {/* Language Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('ja')}
            className={`px-4 py-2 rounded ${lang === 'ja' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            日本語
          </button>
          <button
            onClick={() => setLanguage('zh-Hans')}
            className={`px-4 py-2 rounded ${lang === 'zh-Hans' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            简体中文
          </button>
          <button
            onClick={() => setLanguage('zh-Hant')}
            className={`px-4 py-2 rounded ${lang === 'zh-Hant' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            繁體中文
          </button>
        </div>
      </header>

      <section>
        <RosterSelector />
      </section>

      <section>
        <LevelEditor />
      </section>

      <section>
        <MissionPicker />
      </section>
    </div>
  );
}
