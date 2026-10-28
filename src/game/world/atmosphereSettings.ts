import { Color3 } from '@babylonjs/core';

/** Light and fog values for one map; the sun direction points from the sun towards the ground. */
export interface AtmosphereSettings {
  sun: { direction: [number, number, number]; color: Color3; intensity: number };
  hemisphere: { sky: Color3; ground: Color3; intensity: number };
  fog: { color: Color3; flashColor: Color3; density: number };
}

export const TEST_GROUND_ATMOSPHERE: AtmosphereSettings = {
  sun: { direction: [-0.58, -0.62, 0.53], color: new Color3(1, 0.79, 0.56), intensity: 1.05 },
  hemisphere: { sky: new Color3(0.7, 0.74, 0.74), ground: new Color3(0.27, 0.24, 0.19), intensity: 0.6 },
  fog: { color: new Color3(0.38, 0.345, 0.30), flashColor: new Color3(0.62, 0.57, 0.49), density: 0.0039 },
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
};
