import { useState } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import type { Language } from '../types';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  const { lang, setLanguage } = useLanguageStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pages = [
    { id: 'home', label: { ja: 'ホーム', 'zh-Hans': '首页', 'zh-Hant': '首頁' } },
    { id: 'roster', label: { ja: 'キャラ選択', 'zh-Hans': '选择角色', 'zh-Hant': '選擇角色' } },
    { id: 'levels', label: { ja: 'レベル設定', 'zh-Hans': '设置等级', 'zh-Hant': '設置等級' } },
    { id: 'missions', label: { ja: '依頼選択', 'zh-Hans': '选择委托', 'zh-Hant': '選擇委託' } },
    { id: 'results', label: { ja: '結果', 'zh-Hans': '结果', 'zh-Hant': '結果' } },
  ];

  const languages: { value: Language; label: string }[] = [
    { value: 'ja', label: '日本語' },
    { value: 'zh-Hans', label: '简体中文' },
    { value: 'zh-Hant', label: '繁體中文' },
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
              {lang === 'ja' ? 'ステラソラ依頼アシスト' :
                lang === 'zh-Hans' ? 'Stella Sora 委托助手' : 'Stella Sora 委託助手'}
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
                  {page.label[lang] || page.label.ja}
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
                    {page.label[lang] || page.label.ja}
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
            <p>
              {lang === 'ja' ? 'ステラソラ依頼アシスト' :
                lang === 'zh-Hans' ? 'Stella Sora 委托助手' : 'Stella Sora 委託助手'}
              {' | '}
              <a
                href="https://github.com/Taka499/ss-assist"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GitHub
              </a>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {lang === 'ja' ? '非公式ファンツール' :
                lang === 'zh-Hans' ? '非官方粉丝工具' : '非官方粉絲工具'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
