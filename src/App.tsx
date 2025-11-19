import { useEffect, useState } from 'react';
import { loadData, isDataLoaded } from './lib/data';
import { useLanguageStore } from './store/useLanguageStore';
import { useTranslation } from '../i18n';
import { AppLayout } from './components/AppLayout';
import { Home } from './pages/Home';
import { RosterManagement } from './pages/RosterManagement';
import { LevelManagement } from './pages/LevelManagement';
import { CommissionSelection } from './pages/CommissionSelection';
import { Results } from './pages/Results';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const lang = useLanguageStore((state) => state.lang);
  const { t } = useTranslation(lang);

  // Update document title and HTML lang attribute when language changes
  useEffect(() => {
    document.title = t('app.title');
    document.documentElement.lang = lang;
  }, [lang, t]);

  // Load data on mount
  useEffect(() => {
    if (!isDataLoaded()) {
      loadData()
        .then(() => setIsLoading(false))
        .catch((error) => {
          console.error('Failed to load data:', error);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      const page = hash.replace('/', '') || 'home';
      setCurrentPage(page);
    };

    handleHashChange(); // Initial load
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: string) => {
    window.location.hash = `#/${page}`;
    window.scrollTo(0, 0); // Scroll to top
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={navigate} />;
      case 'roster':
        return <RosterManagement onNavigate={navigate} />;
      case 'levels':
        return <LevelManagement onNavigate={navigate} />;
      case 'missions':
        return <CommissionSelection onNavigate={navigate} />;
      case 'results':
        return <Results onNavigate={navigate} />;
      default:
        return <Home onNavigate={navigate} />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={navigate}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
