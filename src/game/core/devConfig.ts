import type { WeatherId } from '../world/atmosphereSettings.ts';
import type { FilmSpot } from '../world/filmSetLayout.ts';

export interface DevSessionConfig {
  map: 'test' | 'kul' | 'set';
  weather: WeatherId;
  tank: '01' | '02';
  mode: 'free' | 'duel' | '5v5' | '3v3';
  base: 'A' | 'B';
  filmSpot: FilmSpot;
}

export const DEFAULT_DEV_CONFIG: DevSessionConfig = {
  map: 'set', weather: 'storm', tank: '01', mode: 'free', base: 'A', filmSpot: 'runway',
};

export const PLAY_CONFIG: DevSessionConfig = { ...DEFAULT_DEV_CONFIG, mode: '3v3', filmSpot: 'runway' };
