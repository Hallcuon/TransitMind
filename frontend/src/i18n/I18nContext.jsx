import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messages } from './messages';

const STORAGE_KEY = 'transitmind-locale';

const resolvePath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
};

const interpolate = (str, vars) => {
  if (!vars || typeof str !== 'string') return str;
  let out = str;
  Object.entries(vars).forEach(([k, v]) => {
    const placeholder = `{{${k}}}`;
    out = out.split(placeholder).join(String(v));
  });
  return out;
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'uk') return stored;
    } catch {
      /* ignore */
    }
    return 'uk';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'uk' ? 'uk' : 'en';
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (next === 'en' || next === 'uk') setLocaleState(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const uk = resolvePath(messages.uk, key);
      const en = resolvePath(messages.en, key);
      const raw = locale === 'uk' ? uk ?? en : en ?? uk;
      if (raw == null) return key;
      return interpolate(raw, vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
