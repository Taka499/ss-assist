import { useLanguageStore } from './store/useLanguageStore';

function App() {
  const { lang } = useLanguageStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          ステラソラ依頼アシスト
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Stella Sora Request Assistant - Phase 3 Development
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Current language: <span className="font-mono font-bold">{lang}</span>
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Open DevTools Console to test the stores manually.
        </p>
      </div>
    </div>
  );
}

export default App;
