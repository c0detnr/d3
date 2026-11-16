import { create } from 'zustand';
import { DEFAULT_DEV_CONFIG, type DevSessionConfig } from './devConfig.ts';
import { readSave, writeSave, type Settings } from './playerSave.ts';
import { MISSIONS } from './missions.ts';
import { setLanguage } from '../i18n/index.ts';
export type ShellScreen = 'home' | 'tankSelect' | 'droneSelect' | 'developer' | 'missions' | 'briefing' | 'settings' | 'controls' | 'credits' | 'playing' | 'pause' | 'result';
/** Mission logic calls finishMission when authoritative objectives resolve. */
export interface MissionResult { missionId: string; victory: boolean; seconds: number; shots: number; hits: number; damageTaken?: number; stars: number }
const initial = readSave();
setLanguage(initial.settings.language);
interface ShellState {
  devConfig: DevSessionConfig;
  screen: ShellScreen; returnTo: ShellScreen; selected: string; settings: Settings; progress: typeof initial.missions; result?: MissionResult; storageAvailable: boolean;
  navigate: (screen: ShellScreen) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  finishMission: (result: MissionResult) => void;
}
export const useShellStore = create<ShellState>((set, get) => ({
  devConfig: { ...DEFAULT_DEV_CONFIG },
  screen: 'home', returnTo: 'home', selected: 'rookie', settings: initial.settings, progress: initial.missions, storageAvailable: true,
  navigate: screen => set({ screen: !get().settings.devMode && ['developer', 'missions', 'briefing'].includes(screen) ? 'home' : screen }),
  updateSettings: patch => {
    const settings = { ...get().settings, ...patch };
    setLanguage(settings.language);
    const storageAvailable = writeSave({ version: 1, settings, missions: get().progress });
    set({ settings, storageAvailable, ...(!settings.devMode ? {
      ...(['developer', 'missions', 'briefing', 'result'].includes(get().screen) ? { screen: 'home' as const } : {}),
      ...(['developer', 'missions', 'briefing', 'result'].includes(get().returnTo) ? { returnTo: 'home' as const } : {}),
    } : {}) });
  },
  finishMission: result => {
    if (!MISSIONS.some(m => m.id === result.missionId && m.playable)) return;
    const clean = { ...result, damageTaken: Math.max(0, Number.isFinite(result.damageTaken) ? result.damageTaken! : 0), seconds: Math.max(0, Number.isFinite(result.seconds) ? result.seconds : 0), shots: Math.max(0, Number.isFinite(result.shots) ? result.shots : 0), hits: Math.max(0, Number.isFinite(result.hits) ? result.hits : 0), stars: result.victory ? Math.max(0, Math.min(3, Math.round(result.stars) || 0)) : 0 };
    const progress = { ...get().progress };
    if (clean.victory) progress[clean.missionId] = { completed: true, stars: Math.max(progress[clean.missionId]?.stars ?? 0, clean.stars), stats: { seconds: clean.seconds, shots: clean.shots, hits: clean.hits, damageTaken: clean.damageTaken } };
    const storageAvailable = writeSave({ version: 1, settings: get().settings, missions: progress });
    set({ result: clean, progress, screen: 'result', storageAvailable });
  },
}));
