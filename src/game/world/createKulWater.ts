import { optimizeStaticProps } from './optimizeStaticProps.ts';
import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { KUL_CONNECTIONS, kulTerrainHeight } from './kulVadisiLayout.ts';

/** Metres. Shallow stream ribbon along the straight creek bed; tapers out at both ends. */
const HALF_WIDTH = 4.5, X_LIMIT = 150, X_STEP = 4, TAPER = 30, DEPTH = 0.35;
const LATERAL = [-1, -0.5, 0, 0.5, 1];

/** Visual-only water; no physics, never pickable. Tanks wade through it. */
export function createKulWater(scene: Scene) {
  const material = new StandardMaterial('kul-water', scene);
  material.diffuseColor = Color3.FromHexString('#4F7F8C'); material.emissiveColor = Color3.FromHexString('#1D3A44');
  material.specularColor = Color3.FromHexString('#9FB8BF'); material.specularPower = 48;
  material.alpha = 0.72; material.backFaceCulling = false; material.zOffset = -2;
  const meshes: Mesh[] = [];
  for (const creek of KUL_CONNECTIONS) {
    const z = creek.points[2].z;
    const xs = Array.from({ length: Math.round(2 * X_LIMIT / X_STEP) + 1 }, (_, i) => -X_LIMIT + i * X_STEP);
    // Surface rides just above the lowest bed point across the channel, lightly smoothed along the flow.
    const bed = xs.map(x => Math.min(...LATERAL.map(l => kulTerrainHeight(x, z + l * HALF_WIDTH))) + DEPTH);
    const level = bed.map((_, i) => (bed[Math.max(0, i - 1)] + bed[i] + bed[Math.min(bed.length - 1, i + 1)]) / 3);
    const paths = LATERAL.map(l => xs.map((x, i) => {
      const taper = Math.min(1, (X_LIMIT - Math.abs(x)) / TAPER);
      return new Vector3(x, level[i], z + l * HALF_WIDTH * Math.max(0.05, taper));
    }));
    const mesh = MeshBuilder.CreateRibbon(`kul-water-${creek.id}`, { pathArray: paths }, scene);
    mesh.material = material; mesh.isPickable = false; mesh.metadata = { water: true };
    mesh.convertToFlatShadedMesh(); mesh.freezeWorldMatrix(); meshes.push(mesh);
  }
  optimizeStaticProps(meshes, []);
  return { meshes, dispose() { meshes.forEach(m => m.dispose()); material.dispose(); } };
}
