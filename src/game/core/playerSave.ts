export const SAVE_KEY = 'iron-dust.player.v1';
export type Language = 'tr' | 'en';
export type Quality = 'low' | 'medium' | 'high';
export interface Settings { devMode: boolean; language: Language; sensitivity: number; invertY: boolean; volume: number; musicVolume: number; quality: Quality }
export interface MissionStats { seconds: number; shots: number; hits: number; damageTaken: number }
export interface Progress { stars: number; completed: boolean; stats?: MissionStats }
export interface PlayerSave { version: 1; settings: Settings; missions: Record<string, Progress> }
export const defaults = (): PlayerSave => ({ version: 1, settings: { devMode: false, language: 'tr', sensitivity: 1, invertY: false, volume: .7, musicVolume: .7, quality: 'medium' }, missions: {} });
const clamp = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export function readSave(storage?: Pick<Storage, 'getItem'>): PlayerSave {
  const save = defaults();
  try {
    const raw = JSON.parse((storage ?? localStorage).getItem(SAVE_KEY) ?? 'null');
    if (raw?.version !== 1) return save;
    const s = raw.settings ?? {};
    save.settings = { devMode: s.devMode === true, language: s.language === 'en' ? 'en' : 'tr', sensitivity: clamp(s.sensitivity, 1, .2, 3), invertY: s.invertY === true, volume: clamp(s.volume, .7, 0, 1), musicVolume: clamp(s.musicVolume, .7, 0, 1), quality: ['low', 'medium', 'high'].includes(s.quality) ? s.quality : 'medium' };
    for (const id of ['rookie', 'supplies', 'bridge', 'factory', 'colonel']) {
      const p = raw.missions?.[id];
      if (p) save.missions[id] = { stars: Math.round(clamp(p.stars, 0, 0, 3)), completed: p.completed === true };
      if (p?.stats) save.missions[id].stats = { seconds: clamp(p.stats.seconds, 0, 0, Number.MAX_SAFE_INTEGER), shots: clamp(p.stats.shots, 0, 0, Number.MAX_SAFE_INTEGER), hits: clamp(p.stats.hits, 0, 0, Number.MAX_SAFE_INTEGER), damageTaken: clamp(p.stats.damageTaken, 0, 0, Number.MAX_SAFE_INTEGER) };
    }
  } catch { /* Storage can be disabled in embedded games. */ }
  return save;
}
export function writeSave(save: PlayerSave, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? localStorage).setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}
