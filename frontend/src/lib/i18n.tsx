import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en, type MessageKey } from '@/locales/en';
import { hi } from '@/locales/hi';

export type Lang = 'en' | 'hi';
// eslint-disable-next-line react-refresh/only-export-components
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
];

const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { en, hi };
const STORAGE_KEY = 'shieldiq-lang';

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Fills {name} placeholders. */
const format = (text: string, vars?: Record<string, string | number>) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

// eslint-disable-next-line react-refresh/only-export-components
export const translate = (lang: Lang, key: MessageKey, vars?: Record<string, string | number>) => format(DICTIONARIES[lang][key], vars);

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
  /** Server messages arrive in English; known ones are shown in the user's language. */
  tServer: (message: string | null | undefined) => string | null;
}

const SERVER_MESSAGES: Record<string, MessageKey> = {
  'Invalid email or password': 'server.invalidLogin',
  'An account with this email already exists': 'server.emailTaken',
  'Too many attempts. Please try again later.': 'server.tooManyAttempts',
  'Too many failed sign-in attempts for this account. Please try again later.': 'server.tooManyAttempts',
  'This reset link is invalid or has expired.': 'server.resetExpired',
  'Current password is incorrect.': 'server.wrongCurrentPassword',
  'That password is incorrect.': 'server.wrongPassword',
  'If an account exists for that email, a reset link has been sent.': 'server.resetSent',
  'Cannot reach the ShieldIQ server. Please try again.': 'common.serverUnreachable',
  'The answer was interrupted. Please try again.': 'server.chatInterrupted',
  'Cannot reach ShieldIQ. Please try again.': 'server.chatUnreachable',
};

/** True once the person has picked a language on this device. */
// eslint-disable-next-line react-refresh/only-export-components
export const hasStoredLang = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const readStoredLang = (): Lang => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') return saved;
  } catch {
    // storage blocked (private mode): fall through to the browser language
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en';
};

const make = (lang: Lang, setLang: (l: Lang) => void): I18n => ({
  lang,
  setLang,
  t: (key, vars) => translate(lang, key, vars),
  tServer: message => (message ? (SERVER_MESSAGES[message] ? translate(lang, SERVER_MESSAGES[message]) : message) : null),
});

// English without a provider, so components render in isolation (and in tests) unchanged.
const I18nContext = createContext<I18n>(make('en', () => {}));

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(readStoredLang);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // not persisted; still applies for this visit
    }
  }, []);
  // lang on <html> lets screen readers pick the right voice and the CSS pick Devanagari typography.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(() => make(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => useContext(I18nContext);
