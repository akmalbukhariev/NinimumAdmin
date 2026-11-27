import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { LanguageProvider, useLanguage } from './i18n/LanguageProvider';
import { muiLocale } from './i18n/muiLocale';
import { createTheme } from '@mui/material/styles';
import { useMemo, type ReactNode } from 'react';
import './styles.css';
import { theme } from './theme';

// The theme follows the chosen language, so MUI's own texts (table paging, "No options") are not English.
function LocalizedTheme({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const localized = useMemo(() => createTheme(theme, muiLocale(language)), [language]);
  return <ThemeProvider theme={localized}>{children}</ThemeProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <LocalizedTheme>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </LocalizedTheme>
    </LanguageProvider>
  </React.StrictMode>,
);
