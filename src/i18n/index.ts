import { getLocales } from "expo-localization";
import "expo-sqlite/localStorage/install";
import { useMemo, useSyncExternalStore } from "react";

import { de, type Translations } from "./de";
import { en } from "./en";

export type Language = "de" | "en";
export const LANGUAGES: readonly Language[] = ["de", "en"];
/** Each language in its own name, for the language switch. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  de: "Deutsch",
  en: "English",
};

const SHEETS: Record<Language, Translations> = { de, en };
/** For dates: toLocaleDateString(locale, …) */
const LOCALES: Record<Language, string> = { de: "de-DE", en: "en-US" };
const STORAGE_KEY = "language";

/** "common.cancel", "dares.status.failed", … — every leaf key of the sheet. */
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type TranslationKey = Leaves<Translations>;

type Params = Record<string, string | number>;

/** Saved choice, otherwise the device language (German or English). */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "de" || saved === "en") return saved;
  } catch {
    // Storage not available: fall through to the device language
  }
  return getLocales()[0]?.languageCode === "de" ? "de" : "en";
}

let current: Language = initialLanguage();
const listeners = new Set<() => void>();

export function getLanguage() {
  return current;
}

export function getLocale() {
  return LOCALES[current];
}

export function setLanguage(language: Language) {
  if (language === current) return;
  current = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not saved: the choice only lasts until the app restarts
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function translate(
  language: Language,
  key: TranslationKey,
  params?: Params,
): string {
  let node: unknown = SHEETS[language];
  for (const part of key.split(".")) {
    node = (node as Record<string, unknown>)[part];
  }
  const text = typeof node === "string" ? node : key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Translate a key into the current language and fill in {placeholders}.
 * Works outside React too (e.g. error messages in utils/).
 * Inside components use the `t` from useI18n() instead (see there).
 */
export function t(key: TranslationKey, params?: Params): string {
  return translate(current, key, params);
}

/**
 * Use in components: re-renders them when the language changes.
 *   const { t } = useI18n();
 */
export function useI18n() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  // A new function per language: React Compiler caches texts by the identity
  // of `t`, so a stable function would keep showing the old language.
  const boundT = useMemo(
    () => (key: TranslationKey, params?: Params) =>
      translate(language, key, params),
    [language],
  );
  return { t: boundT, language, locale: LOCALES[language], setLanguage };
}
