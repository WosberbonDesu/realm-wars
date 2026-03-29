/**
 * React hook that re-renders the component when language changes.
 * Returns the `t` function bound to the current language.
 */
import { useState, useEffect, useCallback } from 'react';
import { t as translate, onLanguageChange, getLanguage, LangCode } from './index';

export function useI18n() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return onLanguageChange(() => setTick(n => n + 1));
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(key, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getLanguage()],
  );

  return { t, lang: getLanguage() };
}
