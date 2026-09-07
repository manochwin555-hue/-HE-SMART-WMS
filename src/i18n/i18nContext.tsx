import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationDictionary, LANGUAGE_OPTIONS } from './types';
import { th } from './locales/th';
import { en } from './locales/en';
import { kh } from './locales/kh';
import { mm } from './locales/mm';
import { kr } from './locales/kr';

const dictionaries: Record<Language, TranslationDictionary> = {
  th,
  en,
  kh,
  mm,
  kr,
};

const STORAGE_KEY = 'wms-language';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  dict: TranslationDictionary;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'th' || saved === 'en' || saved === 'kh' || saved === 'mm' || saved === 'kr')) {
        return saved as Language;
      }
    } catch (e) {
      console.warn('Could not read wms-language from localStorage', e);
    }
    return 'th';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Could not save wms-language to localStorage', e);
    }
  };

  const dict = dictionaries[language] || dictionaries.th;

  // Translation helper function
  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    if (!keyPath) return '';

    const parts = keyPath.split('.');
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to Thai or English if missing
        let fallback: any = dictionaries.th;
        for (const fbPart of parts) {
          if (fallback && typeof fallback === 'object' && fbPart in fallback) {
            fallback = fallback[fbPart];
          } else {
            fallback = undefined;
            break;
          }
        }
        current = fallback || keyPath;
        break;
      }
    }

    if (typeof current !== 'string') {
      return keyPath;
    }

    let result = current;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return result;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dict }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

export { LANGUAGE_OPTIONS };
