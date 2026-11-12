import { LoadAssetContainerAsync, Mesh, PhysicsAggregate, PhysicsShapeType, TransformNode, type Scene } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';
import { kulTerrainHeight, type KulStructure } from './kulVadisiLayout.ts';

registerBuiltInLoaders();

/** Preserve metre scale and the glTF handedness root; only recenter the footprint. */
export async function loadFactoryBuilding(scene: Scene, source: string | Uint8Array, structure: Omit<KulStructure, 'kind'> & { kind: KulStructure['kind'] | 'ruin' | 'wreck' }, groundHeight = kulTerrainHeight) {
  const assets = await LoadAssetContainerAsync(source, scene, { pluginExtension: '.glb' });
  if (scene.isDisposed) { assets.dispose(); throw new Error('Building loaded after scene disposal.'); }
  const anchor = new TransformNode(structure.id, scene);
  anchor.rotation.y = structure.yaw ?? 0;
  const bodies: PhysicsAggregate[] = [];
  const dispose = () => { bodies.forEach(body => body.dispose()); assets.dispose(); anchor.dispose(); };
  try {
    assets.addAllToScene();
    assets.rootNodes.forEach(root => { root.parent = anchor; });
    const meshes = assets.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
    const visible = meshes.filter(mesh => !mesh.metadata?.gltf?.extras?.collision_only);
    const colliders = meshes.filter(mesh => mesh.metadata?.gltf?.extras?.collision_only);
    if (!visible.length || !colliders.length) throw new Error(`Missing building geometry: ${structure.id}`);
    meshes.forEach(mesh => mesh.computeWorldMatrix(true));
    const minX = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.x));
    const maxX = Math.max(...visible.map(m => m.getBoundingInfo().boundingBox.maximumWorld.x));
    const minZ = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.z));
    const maxZ = Math.max(...visible.map(m => m.getBoundingInfo().boundingBox.maximumWorld.z));
    const minY = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.y));
    // Preserve Kül Vadisi's graded placements; custom terrain uses the lowest footprint sample.
    let baseY = groundHeight(structure.x, structure.z);
    if (groundHeight !== kulTerrainHeight) {
      const cos = Math.cos(structure.yaw ?? 0), sin = Math.sin(structure.yaw ?? 0);
      const nx = Math.ceil(structure.width), nz = Math.ceil(structure.depth);
      for (let ix = 0; ix <= nx; ix++) for (let iz = 0; iz <= nz; iz++) {
        const dx = (ix / nx - 0.5) * structure.width, dz = (iz / nz - 0.5) * structure.depth;
        baseY = Math.min(baseY, groundHeight(structure.x + dx * cos + dz * sin, structure.z - dx * sin + dz * cos));
      }
    }
    anchor.position.set(structure.x - (minX + maxX) / 2, baseY - minY, structure.z - (minZ + maxZ) / 2);
    for (const mesh of meshes) {
      const collisionOnly = !!mesh.metadata?.gltf?.extras?.collision_only;
      mesh.metadata = { ...mesh.metadata, structure: structure.id, kind: structure.kind, hardCover: true, surface: structure.kind === 'hangar' || structure.kind === 'wreck' ? 'metal' : 'concrete' };
      mesh.isVisible = !collisionOnly; mesh.isPickable = !collisionOnly; mesh.receiveShadows = !collisionOnly;
      mesh.computeWorldMatrix(true);
      if (collisionOnly) bodies.push(new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0, friction: 0.85, restitution: 0 }, scene));
      mesh.freezeWorldMatrix();
    }
    return { meshes, shadowCasters: visible, dispose };
  } catch (error) { dispose(); throw error; }
}
