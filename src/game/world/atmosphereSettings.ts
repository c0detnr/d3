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

/** Light and fog values for one map; the sun direction points from the sun towards the ground. */
export interface AtmosphereSettings {
  sun: { direction: [number, number, number]; color: Color3; intensity: number };
  hemisphere: { sky: Color3; ground: Color3; intensity: number };
  fog: { color: Color3; flashColor: Color3; density: number };
  sky: SkySettings;
  exposure?: number;
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
export const WEATHER_LABELS: Record<WeatherId, string> = {
  storm: 'Fırtına', dawn: 'Sisli şafak', noon: 'Berrak öğle', sunset: 'Kızıl gün batımı', night: 'Mehtaplı gece',
};

/** Kul Vadisi weather. Each preset changes sun angle, colour temperature, fog depth and sky together so they read differently at a glance. */
export const KUL_WEATHER: Record<WeatherId, AtmosphereSettings> = {
  storm: KUL_ATMOSPHERE,
  // Cold pink-grey light under a low sun; thick fog swallows the mountain ring.
  dawn: {
    sun: { direction: [-0.8, -0.14, 0.55], color: new Color3(1, 0.78, 0.68), intensity: 0.85 },
    hemisphere: { sky: new Color3(0.55, 0.62, 0.74), ground: new Color3(0.26, 0.24, 0.26), intensity: 0.5 },
    fog: { color: new Color3(0.5, 0.47, 0.5), flashColor: new Color3(0.5, 0.47, 0.5), density: 0.0036 },
    sky: {
      zenith: hex('#7C94B5'), mid: hex('#B9BFCB'), horizon: hex('#F1C9B0'),
      cloudDark: hex('#8D93A3'), cloudLight: hex('#F4DCCD'),
      cloudEdge: 0.42, body: { radius: 0.03, halo: 0.35, color: new Color3(1, 0.85, 0.72) }, stars: 0, lightning: false,
    },
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
  },
  // Red-orange glow from the opposite side; long shadows and a dark violet zenith.
  sunset: {
    sun: { direction: [0.7, -0.15, 0.45], color: new Color3(1, 0.45, 0.2), intensity: 1.3 },
    hemisphere: { sky: new Color3(0.55, 0.4, 0.5), ground: new Color3(0.18, 0.1, 0.09), intensity: 0.45 },
    fog: { color: new Color3(0.62, 0.36, 0.28), flashColor: new Color3(0.62, 0.36, 0.28), density: 0.0034 },
    sky: {
      zenith: hex('#2B2250'), mid: hex('#8A3F5A'), horizon: hex('#FF7A2E'),
      cloudDark: hex('#4A2438'), cloudLight: hex('#FF9A55'),
      cloudEdge: 0.44, body: { radius: 0.04, halo: 0.6, color: new Color3(1, 0.55, 0.25) }, stars: 0, lightning: false,
    },
  },
  // Dim blue moonlight, stars, dark fog; the moon is the only strong highlight.
  night: {
    sun: { direction: [0.35, -0.6, -0.7], color: new Color3(0.55, 0.68, 1), intensity: 0.6 },
    hemisphere: { sky: new Color3(0.16, 0.22, 0.4), ground: new Color3(0.05, 0.06, 0.09), intensity: 0.42 },
    fog: { color: new Color3(0.06, 0.09, 0.15), flashColor: new Color3(0.06, 0.09, 0.15), density: 0.0034 },
    exposure: 1.2,
    sky: {
      zenith: hex('#03060F'), mid: hex('#0A1226'), horizon: hex('#1B2B47'),
      cloudDark: hex('#080C16'), cloudLight: hex('#2A3A5C'),
      cloudEdge: 0.5, body: { radius: 0.035, halo: 0.25, color: new Color3(0.85, 0.91, 1) }, stars: 1, lightning: false,
    },
  },
};

export function weatherFromSearch(search: string): WeatherId {
  const value = new URLSearchParams(search).get('weather');
  return WEATHER_IDS.find(id => id === value) ?? 'storm';
}
