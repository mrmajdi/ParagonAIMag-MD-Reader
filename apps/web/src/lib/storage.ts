import { detectLocale, LOCALE_NAMES, type Locale } from './i18n';
import type { DirectionSetting, FontFamily, Theme } from './types';

const STORAGE_KEY = 'paragon-reader.settings.v1';

export interface Settings {
  theme: Theme;
  locale: Locale;
  fontSize: number;
  fontFamily: FontFamily;
  direction: DirectionSetting;
}

const THEMES: Theme[] = ['light', 'dark', 'sepia'];
const FONTS: FontFamily[] = ['sans', 'serif'];
const DIRECTIONS: DirectionSetting[] = ['auto', 'rtl', 'ltr'];

export function createDefaultSettings(): Settings {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  return {
    theme: prefersDark ? 'dark' : 'light',
    locale: detectLocale(),
    fontSize: 17,
    fontFamily: 'sans',
    direction: 'auto',
  };
}

export function loadSettings(): Settings {
  const defaults = createDefaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: THEMES.includes(parsed.theme as Theme) ? (parsed.theme as Theme) : defaults.theme,
      locale: parsed.locale && parsed.locale in LOCALE_NAMES ? (parsed.locale as Locale) : defaults.locale,
      fontSize:
        typeof parsed.fontSize === 'number'
          ? Math.min(30, Math.max(12, Math.round(parsed.fontSize)))
          : defaults.fontSize,
      fontFamily: FONTS.includes(parsed.fontFamily as FontFamily)
        ? (parsed.fontFamily as FontFamily)
        : defaults.fontFamily,
      direction: DIRECTIONS.includes(parsed.direction as DirectionSetting)
        ? (parsed.direction as DirectionSetting)
        : defaults.direction,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing can make localStorage unavailable; preferences are optional.
  }
}
