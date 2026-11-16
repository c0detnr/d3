import { Color3 } from '@babylonjs/core';

/** Procedural sky palette and sun/moon disc; cloudEdge near 0.2 is overcast, near 0.6 is nearly clear. */
export interface SkySettings {
  zenith: Color3; mid: Color3; horizon: Color3; cloudDark: Color3; cloudLight: Color3;
  cloudEdge: number;
  /** Disc angular radius in radians (0 hides it), halo strength and colour; the disc sits opposite the light direction. */
  body: { radius: number; halo: number; color: Color3 };
  stars: number;
  lightning: boolean;
}

/** Gameplay-facing weather; absent means calm (no distance fog, full sight, dry). */
export interface WeatherEffects {
  /** Exp2 distance-fog density applied to the scene, in 1/m. 0 keeps the long-standing fog-free look. */
  fogDensity: number;
  /** Metres at which AI tanks (and the player's enemy markers) can spot a tank; matched to what the fog/dark lets the player see. */
  sightRange: number;
  /** Rain streak density, 0 (dry) … 1 (downpour); the graphics quality scales the drawn count. */
  rain: number;
  /** Ambience: wind gain factor (1 = calm default) and rain hiss level 0 … 1. */
  audio: { wind: number; rain: number };
}

export const CALM_WEATHER: WeatherEffects = { fogDensity: 0, sightRange: 180, rain: 0, audio: { wind: 1, rain: 0 } };

/** Light and fog values for one map; the sun direction points from the sun towards the ground. */
export interface AtmosphereSettings {
  sun: { direction: [number, number, number]; color: Color3; intensity: number };
  hemisphere: { sky: Color3; ground: Color3; intensity: number };
  /** `color` tints the clear colour and distant mountains; `density` is a legacy unapplied value (see WeatherEffects.fogDensity). */
  fog: { color: Color3; flashColor: Color3; density: number };
  sky: SkySettings;
  exposure?: number;
  weather?: WeatherEffects;
}

const hex = Color3.FromHexString;

const STORM_SKY: SkySettings = {
  zenith: hex('#151A1D'), mid: hex('#46504F'), horizon: hex('#A87D50'),
  cloudDark: hex('#1E2324'), cloudLight: hex('#8E8878'),
  cloudEdge: 0.34, body: { radius: 0, halo: 0, color: Color3.Black() }, stars: 0, lightning: true,
};

export const TEST_GROUND_ATMOSPHERE: AtmosphereSettings = {
  sun: { direction: [-0.58, -0.62, 0.53], color: new Color3(1, 0.79, 0.56), intensity: 1.05 },
  hemisphere: { sky: new Color3(0.7, 0.74, 0.74), ground: new Color3(0.27, 0.24, 0.19), intensity: 0.6 },
  fog: { color: new Color3(0.38, 0.345, 0.30), flashColor: new Color3(0.62, 0.57, 0.49), density: 0.0039 },
  sky: STORM_SKY,
};

/**
 * Kul Vadisi: low warm sun (~20° elevation) so facet normals differ clearly in tone, cool sky fill
 * against a dark earthy bounce, and a lighter, thinner fog whose colour is shared with the
 * distant mountain layers (createKulMountains bakes them toward `fog.color`).
 */
export const KUL_ATMOSPHERE: AtmosphereSettings = {
  sun: { direction: [-0.72, -0.36, 0.6], color: new Color3(1, 0.72, 0.46), intensity: 1.2 },
  hemisphere: { sky: new Color3(0.5, 0.62, 0.76), ground: new Color3(0.2, 0.15, 0.11), intensity: 0.5 },
  fog: { color: new Color3(0.45, 0.42, 0.37), flashColor: new Color3(0.66, 0.61, 0.52), density: 0.0028 },
  sky: STORM_SKY,
};

export const WEATHER_IDS = ['storm', 'dawn', 'noon', 'sunset', 'night'] as const;
export type WeatherId = typeof WEATHER_IDS[number];
/** Ids are kept from the earlier time-of-day presets so saved developer settings stay valid. */
export const WEATHER_LABELS: Record<WeatherId, string> = {
  storm: 'Yağmurlu fırtına', dawn: 'Yoğun sis', noon: 'Açık gün', sunset: 'Gün batımı', night: 'Ay ışıklı gece',
};
/** HUD icon per weather (src/game/ui/icons.ts). */
export const WEATHER_ICONS = { storm: 'rain', dawn: 'fog', noon: 'day', sunset: 'sunset', night: 'moon' } as const satisfies Record<WeatherId, string>;
/** Calm, readable presets for the menu backdrop (its lighting is boosted for the attract camera). */
export const MENU_WEATHER_IDS = ['noon', 'sunset', 'dawn'] as const satisfies readonly WeatherId[];
export function randomWeather(random: () => number = Math.random, ids: readonly WeatherId[] = WEATHER_IDS): WeatherId {
  return ids[Math.min(ids.length - 1, Math.floor(random() * ids.length))];
}

/**
 * Five match weathers. Each changes light, sky and a real weather element together:
 * clear day, golden-hour haze, dense fog, rain storm with lightning, moonlit night.
 */
export const KUL_WEATHER: Record<WeatherId, AtmosphereSettings> = {
  // Cold, wet, dark: overcast storm deck, flat cool light, rain streaks, lightning and short sight.
  storm: {
    sun: { direction: [-0.45, -0.7, 0.55], color: new Color3(0.72, 0.78, 0.88), intensity: 0.62 },
    hemisphere: { sky: new Color3(0.46, 0.52, 0.6), ground: new Color3(0.1, 0.1, 0.1), intensity: 0.62 },
    fog: { color: new Color3(0.27, 0.3, 0.33), flashColor: new Color3(0.62, 0.64, 0.7), density: 0.0042 },
    exposure: 0.95,
    sky: {
      zenith: hex('#0E1317'), mid: hex('#2B343A'), horizon: hex('#55606A'),
      cloudDark: hex('#141A1E'), cloudLight: hex('#5E6872'),
      cloudEdge: 0.22, body: { radius: 0, halo: 0, color: Color3.Black() }, stars: 0, lightning: true,
    },
    weather: { fogDensity: 0.0042, sightRange: 160, rain: 1, audio: { wind: 1.9, rain: 1 } },
  },
  // Dense ground fog under a white overcast: soft shadowless light, the far field disappears at ~150 m.
  dawn: {
    sun: { direction: [-0.5, -0.55, 0.6], color: new Color3(0.92, 0.92, 0.9), intensity: 0.5 },
    hemisphere: { sky: new Color3(0.78, 0.8, 0.82), ground: new Color3(0.36, 0.35, 0.33), intensity: 0.78 },
    fog: { color: new Color3(0.62, 0.64, 0.64), flashColor: new Color3(0.62, 0.64, 0.64), density: 0.0085 },
    sky: {
      zenith: hex('#8E979C'), mid: hex('#A7AEB0'), horizon: hex('#B8BDBC'),
      cloudDark: hex('#9AA1A4'), cloudLight: hex('#C9CDCC'),
      cloudEdge: 0.16, body: { radius: 0, halo: 0.18, color: new Color3(0.95, 0.93, 0.86) }, stars: 0, lightning: false,
    },
    weather: { fogDensity: 0.0085, sightRange: 120, rain: 0, audio: { wind: 0.55, rain: 0 } },
  },
  // High white sun, saturated blue sky, hard short shadows, clear distance.
  noon: {
    sun: { direction: [-0.25, -0.88, 0.3], color: new Color3(1, 0.97, 0.9), intensity: 1.5 },
    hemisphere: { sky: new Color3(0.55, 0.72, 0.95), ground: new Color3(0.32, 0.28, 0.22), intensity: 0.62 },
    fog: { color: new Color3(0.68, 0.8, 0.92), flashColor: new Color3(0.68, 0.8, 0.92), density: 0.0011 },
    sky: {
      zenith: hex('#2E6FD0'), mid: hex('#6FA6E6'), horizon: hex('#BFDCF2'),
      cloudDark: hex('#C9D6E6'), cloudLight: hex('#FFFFFF'),
      cloudEdge: 0.56, body: { radius: 0.022, halo: 0.45, color: new Color3(1, 0.98, 0.92) }, stars: 0, lightning: false,
    },
    weather: CALM_WEATHER,
  },
  // Golden hour: red-orange glow from the opposite side, long shadows, a thin warm haze and evening wind.
  sunset: {
    sun: { direction: [0.7, -0.15, 0.45], color: new Color3(1, 0.45, 0.2), intensity: 1.3 },
    hemisphere: { sky: new Color3(0.55, 0.4, 0.5), ground: new Color3(0.18, 0.1, 0.09), intensity: 0.45 },
    fog: { color: new Color3(0.62, 0.36, 0.28), flashColor: new Color3(0.62, 0.36, 0.28), density: 0.0034 },
    sky: {
      zenith: hex('#2B2250'), mid: hex('#8A3F5A'), horizon: hex('#FF7A2E'),
      cloudDark: hex('#4A2438'), cloudLight: hex('#FF9A55'),
      cloudEdge: 0.44, body: { radius: 0.04, halo: 0.6, color: new Color3(1, 0.55, 0.25) }, stars: 0, lightning: false,
    },
    weather: { fogDensity: 0.0016, sightRange: 180, rain: 0, audio: { wind: 1.25, rain: 0 } },
  },
  // Blue moonlight, stars, dark haze; bright enough to drive, the moon is the only strong highlight.
  night: {
    sun: { direction: [0.35, -0.6, -0.7], color: new Color3(0.55, 0.68, 1), intensity: 0.7 },
    hemisphere: { sky: new Color3(0.2, 0.27, 0.46), ground: new Color3(0.07, 0.08, 0.11), intensity: 0.5 },
    fog: { color: new Color3(0.06, 0.09, 0.15), flashColor: new Color3(0.06, 0.09, 0.15), density: 0.0034 },
    exposure: 1.3,
    sky: {
      zenith: hex('#03060F'), mid: hex('#0A1226'), horizon: hex('#1B2B47'),
      cloudDark: hex('#080C16'), cloudLight: hex('#2A3A5C'),
      cloudEdge: 0.5, body: { radius: 0.035, halo: 0.25, color: new Color3(0.85, 0.91, 1) }, stars: 1, lightning: false,
    },
    weather: { fogDensity: 0.0024, sightRange: 150, rain: 0, audio: { wind: 0.8, rain: 0 } },
  },
};

export function weatherFromSearch(search: string): WeatherId {
  const value = new URLSearchParams(search).get('weather');
  return WEATHER_IDS.find(id => id === value) ?? 'storm';
}
