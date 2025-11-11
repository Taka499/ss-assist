import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useLanguageStore } from './store/useLanguageStore';
import { useAppStore } from './store/useAppStore';

// Expose stores for manual testing (remove in production)
if (import.meta.env.DEV) {
  (window as any).useLanguageStore = useLanguageStore;
  (window as any).useAppStore = useAppStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
