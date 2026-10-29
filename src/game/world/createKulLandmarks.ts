import type { Mesh, Scene } from '@babylonjs/core';
import { loadFactoryBuilding } from './loadFactoryBuilding.ts';
import { KUL_FIELD_LANDMARKS } from './kulLandmarkLayout.ts';

export const landmarkSources = {
  ruin: new URL('../../../assets/environment/farmhouse_ruin_01/farmhouse_ruin_01.glb', import.meta.url).href,
  wreck: new URL('../../../assets/environment/armored_wreck_01/armored_wreck_01.glb', import.meta.url).href,
};

/** Metres. Visible model heights; footprints stay within the layout width/depth. */
const LANDMARK_HEIGHT = { ruin: 6.09, wreck: 2.51 } as const;

/** Central farmhouse ruins and armored wrecks. Hidden collision_only meshes become static Havok bodies. */
export async function createKulLandmarks(scene: Scene, sources: { ruin: string | Uint8Array; wreck: string | Uint8Array } = landmarkSources) {
  const meshes: Mesh[] = [], shadowCasters: Mesh[] = [], parts: { dispose(): void }[] = [];
  const dispose = () => { parts.forEach(part => part.dispose()); parts.length = 0; };
  try {
    for (const p of KUL_FIELD_LANDMARKS) {
      const part = await loadFactoryBuilding(scene, sources[p.kind], {
        id: p.id, kind: 'emplacement', x: p.x, z: p.z, width: p.width, depth: p.depth, height: LANDMARK_HEIGHT[p.kind], yaw: p.yaw,
      });
      parts.push(part);
      for (const mesh of part.meshes) {
        mesh.metadata = { ...mesh.metadata, battlefield: true, landmark: p.kind, ...(p.kind === 'wreck' ? { surface: 'metal' } : {}) };
      }
      meshes.push(...part.meshes); shadowCasters.push(...part.shadowCasters);
    }
    return { meshes, shadowCasters, dispose };
  } catch (error) { dispose(); throw error; }
}
