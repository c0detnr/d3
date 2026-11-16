import { CascadedShadowGenerator, DirectionalLight, ShadowGenerator, type AbstractMesh } from '@babylonjs/core';

/**
 * Camera-following cascaded sun shadows. Units: metres.
 * Near cascades keep tank-scale detail sharp; far cascades cover the battlefield.
 */
export function createSunShadows(sun: DirectionalLight, mobile = false) {
  const shadows = new CascadedShadowGenerator(mobile ? 1024 : 2048, sun);
  shadows.numCascades = mobile ? 2 : 3;
  shadows.lambda = 0.85; // Mostly logarithmic splits: dense texels near the camera.
  shadows.shadowMaxZ = mobile ? 160 : 220; // Beyond this, shadows fade out.
  shadows.cascadeBlendPercentage = 0.12;
  shadows.stabilizeCascades = true; // Stops shimmering edges while the camera orbits.
  shadows.depthClamp = true;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0015;
  shadows.normalBias = 0.012;
  shadows.setDarkness(0.3);
  return shadows;
}

/** Register individual render meshes; recursive registration would bypass the size filter. */
export function addShadowCasters(shadows: ShadowGenerator, meshes: readonly AbstractMesh[], minRadius = 0.9) {
  for (const mesh of meshes) {
    if (!mesh.isVisible || mesh.isDisposed() || !mesh.getTotalVertices()) continue;
    // Tank detail primitives can span a large hull despite containing only small fittings.
    if (/_Details_primitive/i.test(mesh.name)) continue;
    mesh.computeWorldMatrix(true);
    if (Math.min(mesh.getBoundingInfo().boundingSphere.radiusWorld, mesh.metadata?.staticShadowRadius ?? Infinity) < minRadius) continue;
    shadows.addShadowCaster(mesh, false);
  }
}

export function applySunShadowQuality(shadows: CascadedShadowGenerator, quality: 'low' | 'medium' | 'high', mobile = false) {
  const high = quality === 'high';
  const previous = [shadows.mapSize, shadows.numCascades, shadows.filteringQuality, shadows.shadowMaxZ].join();
  shadows.mapSize = mobile ? 1024 : high ? 2048 : 1024;
  shadows.numCascades = mobile ? 2 : high ? 3 : 2;
  shadows.filteringQuality = mobile ? ShadowGenerator.QUALITY_MEDIUM : high ? ShadowGenerator.QUALITY_MEDIUM : ShadowGenerator.QUALITY_LOW;
  shadows.shadowMaxZ = mobile ? 160 : high ? 220 : 140;
  if (previous !== [shadows.mapSize, shadows.numCascades, shadows.filteringQuality, shadows.shadowMaxZ].join()) {
    // Refresh frozen shader defines after cascade/filter changes without thawing materials.
    for (const material of shadows.getLight().getScene().materials) if (material.isFrozen) material.markDirty(true);
  }
}
