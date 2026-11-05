import { readSave, type Language } from '../core/playerSave.ts';
import { tr, type TranslationKey } from './tr.ts';
import { en } from './en.ts';
export type { TranslationKey };
let language: Language = readSave().settings.language;
export function setLanguage(value: Language) { language = value; if (typeof document !== 'undefined') document.documentElement.lang = value; }
export function t(key: TranslationKey): string { return (language === 'en' ? en : tr)[key]; }
