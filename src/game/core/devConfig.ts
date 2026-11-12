import type { WeatherId } from '../world/atmosphereSettings.ts';
import type { FilmSpot } from '../world/filmSetLayout.ts';

export interface DevSessionConfig {
  map: 'test' | 'kul' | 'set';
  weather: WeatherId;
  tank: '01' | '02';
  mode: 'free' | 'duel' | '5v5';
  base: 'A' | 'B';
  filmSpot: FilmSpot;
}

export const DEFAULT_DEV_CONFIG: DevSessionConfig = {
  map: 'test', weather: 'storm', tank: '01', mode: 'free', base: 'A', filmSpot: 'runway',
};
