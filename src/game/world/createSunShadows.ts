import { CascadedShadowGenerator, DirectionalLight, ShadowGenerator } from '@babylonjs/core';

/**
 * Camera-following cascaded sun shadows. Units: metres.
 * Near cascades keep tank-scale detail sharp; far cascades cover the battlefield.
 */
export function createSunShadows(sun: DirectionalLight, mobile = false) {
  const shadows = new CascadedShadowGenerator(mobile ? 1024 : 2048, sun);
  shadows.numCascades = mobile ? 2 : 4;
  shadows.lambda = 0.85; // Mostly logarithmic splits: dense texels near the camera.
  shadows.shadowMaxZ = mobile ? 160 : 260; // Beyond this, shadows fade out.
  shadows.cascadeBlendPercentage = 0.12;
  shadows.stabilizeCascades = true; // Stops shimmering edges while the camera orbits.
  shadows.depthClamp = true;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = mobile ? ShadowGenerator.QUALITY_MEDIUM : ShadowGenerator.QUALITY_HIGH;
  shadows.bias = 0.0015;
  shadows.normalBias = 0.012;
  shadows.setDarkness(0.3);
  return shadows;
}
