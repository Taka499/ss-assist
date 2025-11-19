import { useState } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';
import type { Language } from '../types';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  const { lang, setLanguage } = useLanguageStore();
  const { t } = useTranslation(lang);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pages = [
    { id: 'home', label: t('nav.home') },
    { id: 'roster', label: t('nav.roster') },
    { id: 'levels', label: t('nav.levels') },
    { id: 'missions', label: t('nav.missions') },
    { id: 'results', label: t('nav.results') },
  ];

  const languages: { value: Language; label: string }[] = [
    { value: 'ja', label: '日本語' },
    { value: 'zh-Hans', label: '简体中文' },
    // { value: 'zh-Hant', label: '繁體中文' }, // Temporarily disabled
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <button
              onClick={() => onNavigate('home')}
              className="text-xl font-bold text-blue-600 hover:text-blue-700"
            >
              {t('app.title')}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => onNavigate(page.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentPage === page.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {page.label}
                </button>
              ))}
            </nav>

            {/* Language Selector */}
            <div className="hidden md:flex items-center gap-2">
              {languages.map((language) => (
                <button
                  key={language.value}
                  onClick={() => setLanguage(language.value)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${lang === language.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {language.label}
                </button>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-2">
              <nav className="flex flex-col gap-1">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onNavigate(page.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-left ${currentPage === page.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {page.label}
                  </button>
                ))}
              </nav>

              <div className="flex gap-2 mt-3 px-4">
                {languages.map((language) => (
                  <button
                    key={language.value}
                    onClick={() => setLanguage(language.value)}
                    className={`flex-1 px-3 py-1 rounded-md text-sm ${lang === language.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p className="flex items-center justify-center gap-2">
              <span>{t('app.title')}</span>
              <span>|</span>
              <a
                href="https://github.com/Taka499/ss-assist"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GitHub
              </a>
              <span>|</span>
              <a
                href="https://x.com/_dev_499"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                aria-label="X (Twitter)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>@_dev_499</span>
              </a>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {t('app.subtitle')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
