import { optimizeStaticProps } from './optimizeStaticProps.ts';
import { inKulRailYard } from './kulRailYardLayout.ts';
import { Color3, Color4, InstancedMesh, LoadAssetContainerAsync, Mesh, MeshBuilder, PBRMaterial, PhysicsAggregate, PhysicsShapeType, StandardMaterial, TransformNode, Vector3, type AbstractMesh, type AssetContainer, type Scene } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';
import { loadFactoryBuilding } from './loadFactoryBuilding.ts';
import { KUL_CORNER_GROVES, KUL_FIELD_COVER, KUL_FIELD_ROCKS, KUL_RIDGE_GROVES } from './kulBattlefieldLayout.ts';
import { treeRandom } from './treeVariation.ts';
import { KUL_STRUCTURES, kulRoadDistance, kulTerrainHeight } from './kulVadisiLayout.ts';

registerBuiltInLoaders();
export const fieldSources = {
  rock1: new URL('../../../assets/environment/quaternius_nature/Rock_Medium_1.glb', import.meta.url).href,
  rock2: new URL('../../../assets/environment/quaternius_nature/Rock_Medium_2.glb', import.meta.url).href,
  pine: new URL('../../../assets/environment/quaternius_nature/Pine_5.glb', import.meta.url).href,
  pineTall: new URL('../../../assets/environment/quaternius_nature/Pine_2.glb', import.meta.url).href,
  deadTree: new URL('../../../assets/environment/quaternius_nature/DeadTree_2.glb', import.meta.url).href,
  broadTree: new URL('../../../assets/environment/quaternius_nature/CommonTree_3.glb', import.meta.url).href,
  rock3: new URL('../../../assets/environment/quaternius_nature/Rock_Medium_3.glb', import.meta.url).href,
  pebble: new URL('../../../assets/environment/quaternius_nature/Pebble_Square_2.glb', import.meta.url).href,
  shortGrass: new URL('../../../assets/environment/quaternius_nature/Grass_Common_Short.glb', import.meta.url).href,
  fern: new URL('../../../assets/environment/quaternius_nature/Fern_1.glb', import.meta.url).href,
  bush: new URL('../../../assets/environment/quaternius_nature/Bush_Common.glb', import.meta.url).href,
  grass: new URL('../../../assets/environment/quaternius_nature/Grass_Wispy_Short.glb', import.meta.url).href,
};

/** Central cover, wooded ridges and quarry dressing. Small details never receive physics bodies. */
export async function createKulBattlefield(scene: Scene, sources: Record<keyof typeof fieldSources, string | Uint8Array> = fieldSources, emplacementSource: string | Uint8Array = new URL('../../../assets/environment/concrete_emplacement_01/concrete_emplacement_01.glb', import.meta.url).href) {
  const meshes: AbstractMesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [], assets: AssetContainer[] = [];
  const roots: { dispose(): void }[] = [];
  const crowns: { mesh: AbstractMesh; x: number; z: number; phase: number; speed: number }[] = [];
  let windTime = 0;
  const windObserver = scene.onBeforeRenderObservable.add(() => {
    windTime += scene.getEngine().getDeltaTime() / 1000;
    // Only leaf instances move; bark, anchors and the independent Havok trunks remain static.
    for (const crown of crowns) {
      const t = windTime * crown.speed + crown.phase;
      crown.mesh.unfreezeWorldMatrix();
      crown.mesh.rotation.x = crown.x + Math.sin(t) * 0.004;
      crown.mesh.rotation.z = crown.z + Math.sin(t * 0.73 + 1.7) * 0.006;
      crown.mesh.freezeWorldMatrix();
    }
  });
  const dispose = () => {
    scene.onBeforeRenderObservable.remove(windObserver); crowns.length = 0;
    bodies.forEach(b => b.dispose()); roots.forEach(r => r.dispose()); meshes.forEach(m => m.dispose());
    assets.forEach(a => a.dispose()); materials.forEach(m => m.dispose());
  };
  const material = (name: string, color: string) => {
    const m = new StandardMaterial(name, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black(); materials.push(m); return m;
  };
  const concrete = material('field-weathered-concrete', '#79796B');
  const vegetation = material('field-dry-vegetation', '#777A50'); vegetation.backFaceCulling = false;
  const metal = material('field-rusted-steel', '#62554A');
  const scuff = material('field-track-scuff', '#514A3A'); scuff.alpha = 0.32;
  // Red gains above one counter the green source texture, giving dry/olive leaves rather than darker green.
  const leafTints = [new Color3(1.65, 0.88, 0.64), new Color3(0.72, 0.8, 0.64), new Color3(1.1, 0.9, 0.62), new Color3(1.9, 0.95, 0.72)];
  const barkTints = ['#AAA08E', '#89877B', '#B1A18A'].map(Color3.FromHexString);
  const solid = (m: AbstractMesh) => bodies.push(new PhysicsAggregate(m, PhysicsShapeType.MESH, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  const box = (name: string, x: number, z: number, width: number, depth: number, height: number, mat: StandardMaterial, hardCover = false) => {
    const mesh = MeshBuilder.CreateBox(name, { width, depth, height }, scene);
    const floor = Math.min(...[-1, 1].flatMap(dx => [-1, 1].map(dz => kulTerrainHeight(x + dx * width / 2, z + dz * depth / 2))));
    mesh.position.set(x, floor + height / 2 - (hardCover ? 0.15 : 0), z); mesh.material = mat;
    mesh.receiveShadows = true; mesh.isPickable = hardCover; mesh.metadata = { hardCover, surface: mat === metal ? 'metal' : 'concrete', battlefield: true };
    meshes.push(mesh); if (hardCover) solid(mesh); return mesh;
  };
  try {
    for (const [i, p] of KUL_FIELD_COVER.entries()) {
      const cover = await loadFactoryBuilding(scene, emplacementSource, {
        ...p, id: `field-cover-${i}`, kind: 'emplacement', yaw: p.z > 0 ? Math.PI : 0,
      });
      roots.push(cover);
      meshes.push(...cover.meshes);
      cover.meshes.forEach(m => { m.metadata.battlefield = true; });
    }
    const templates = {} as Record<keyof typeof sources, AssetContainer>;
    for (const key of Object.keys(sources) as (keyof typeof sources)[]) {
      const container = await LoadAssetContainerAsync(sources[key], scene, { pluginExtension: '.glb' }); assets.push(container);
      if (scene.isDisposed) throw new Error('Battlefield loaded after scene disposal.');
      for (const m of container.materials) if (m instanceof PBRMaterial) {
        m.roughness = 1; m.metallic = 0;
        // Keep the source alpha mask and bark/leaf textures while muting saturated greens.
        if (['pine', 'pineTall', 'broadTree', 'fern', 'shortGrass'].includes(key)) m.albedoColor.multiplyInPlace(Color3.FromHexString('#A6A783'));
      }
      for (const mesh of container.meshes) {
        // Recompute accessor bounds from vertices so clones and instances use the same footprint.
        mesh.refreshBoundingInfo({});
        if (['pine', 'pineTall', 'broadTree', 'deadTree'].includes(key) && mesh instanceof Mesh && mesh.getTotalVertices() > 0) {
          mesh.registerInstancedBuffer('instanceColor', 4);
          mesh.instancedBuffers.instanceColor = new Color4(1, 1, 1, 1);
        }
        if (key === 'bush' || key === 'grass') mesh.material = vegetation;
        mesh.receiveShadows = true;
        mesh.freezeWorldMatrix();
      }
      templates[key] = container;
    }
    const nature = (key: keyof typeof sources, id: string, x: number, z: number, size: number, yaw: number, hardCover: boolean, tree = false) => {
      const random = treeRandom(id);
      const width = tree ? 0.83 + random() * 0.31 : 1;
      const depth = tree ? 0.87 + random() * 0.26 : 1;
      const leanX = tree ? (random() - 0.5) * 0.065 : 0;
      const leanZ = tree ? (random() - 0.5) * 0.065 : 0;
      const tint = random(), shade = 0.88 + random() * 0.16;
      const phase = random() * Math.PI * 2, speed = 0.7 + random() * 0.45;
      // Keep mesh colliders independent; decorative instances share the render and shadow geometry.
      const entry = templates[key].instantiateModelsToScene(name => `${id}-${name}`, false, { doNotInstantiate: hardCover });
      roots.push(...entry.rootNodes);
      const children = entry.rootNodes.flatMap(root => root.getChildMeshes()).filter(m => m.getTotalVertices() > 0);
      if (!children.length) throw new Error(`Missing nature geometry: ${key}`);
      children.forEach(m => m.computeWorldMatrix(true));
      const min = children.reduce((v, m) => Vector3.Minimize(v, m.getBoundingInfo().boundingBox.minimumWorld), new Vector3(Infinity, Infinity, Infinity));
      const max = children.reduce((v, m) => Vector3.Maximize(v, m.getBoundingInfo().boundingBox.maximumWorld), new Vector3(-Infinity, -Infinity, -Infinity));
      const scale = size / (tree ? max.y - min.y : Math.max(max.x - min.x, max.z - min.z));
      const center = min.add(max).scale(0.5);
      for (const root of entry.rootNodes) {
        if (!(root instanceof TransformNode)) continue;
        root.scaling.scaleInPlace(scale);
        // glTF root owns handedness; use an additional parent to retain that transform.
        const anchor = new TransformNode(`${id}-anchor`, scene); roots.push(anchor); root.parent = anchor;
        root.position.subtractInPlace(new Vector3(center.x, min.y, center.z).scale(scale));
        anchor.metadata = { nature: true, key, tree, size }; anchor.rotation.y = yaw; anchor.position.set(x, kulTerrainHeight(x, z) - (hardCover ? 0.3 : 0.04), z);
        anchor.scaling.set(width, 1, depth); anchor.rotation.x = leanX; anchor.rotation.z = leanZ;
      }
      for (const m of children) {
        if (tree && m instanceof InstancedMesh) {
          const leaf = m.material?.name.startsWith('Leaves_');
          const palette = leaf ? leafTints : barkTints;
          const at = tint * (palette.length - 1), index = Math.floor(at);
          const color = Color3.Lerp(palette[index], palette[Math.min(index + 1, palette.length - 1)], at - index).scale(shade);
          m.instancedBuffers.instanceColor = Color4.FromColor3(color);
          if (leaf) {
            if (m.rotationQuaternion) { m.rotationQuaternion.toEulerAnglesToRef(m.rotation); m.rotationQuaternion = null; }
            crowns.push({ mesh: m, x: m.rotation.x, z: m.rotation.z, phase, speed });
          }
        }
        m.computeWorldMatrix(true); m.metadata = { battlefield: true, hardCover, surface: hardCover ? 'concrete' : 'foliage', tree };
        m.isPickable = hardCover; meshes.push(m); if (hardCover) solid(m);
      }
      if (tree) {
        const trunk = MeshBuilder.CreateCylinder(`${id}-trunk-collider`, { height: size * 0.6, diameter: size * 0.045, tessellation: 8 }, scene);
        trunk.position.set(x, kulTerrainHeight(x, z) + size * 0.3 - 0.12, z);
        trunk.isVisible = false; trunk.isPickable = false;
        trunk.metadata = { battlefield: true, treeTrunk: true, hardCover: true, surface: 'soil' };
        meshes.push(trunk); solid(trunk);
      }
    };
    KUL_FIELD_ROCKS.forEach((p, i) => {
      nature(i % 2 ? 'rock2' : 'rock1', `field-rock-${i}`, p.x, p.z, p.scale, i * 1.7, true);
      nature(i % 2 ? 'rock1' : 'rock2', `field-rock-small-${i}`, p.x + 3, p.z + 3, p.scale * 0.6, i, true);
    });
    const clear = (x: number, z: number) => !inKulRailYard(x, z, 10) && kulRoadDistance(x, z) > 13 &&
      KUL_STRUCTURES.every(s => Math.abs(x - s.x) > s.width / 2 + 8 || Math.abs(z - s.z) > s.depth / 2 + 8) &&
      KUL_FIELD_COVER.every(s => Math.abs(x - s.x) > s.width / 2 + 5 || Math.abs(z - s.z) > s.depth / 2 + 5) &&
      KUL_FIELD_ROCKS.every(s => Math.hypot(x - s.x, z - s.z) > s.scale + 2);
    for (let i = 0; i < 180; i++) {
      const x = -115 + ((i * 73.31) % 230), z = -155 + ((i * 47.17) % 310);
      if (!clear(x, z)) continue;
      nature(i % 9 === 0 ? 'bush' : 'grass', `field-plant-${i}`, x, z, i % 9 === 0 ? 2.4 : 1.5, i * 2.4, false);
      if (i % 4 === 0) {
        const rubble = box(`field-rubble-${i}`, x + 2, z, 1.3, 0.8, 0.35, concrete); rubble.rotation.set(0.1, i, 0.12);
        box(`field-steel-${i}`, x - 1, z + 1, 0.2, 2.5, 0.16, metal).rotation.y = i;
      }
    }
    const treePositions: { x: number; z: number }[] = [];
    const plantTree = (key: keyof typeof sources, id: string, x: number, z: number, size: number, yaw: number) => {
      if (!clear(x, z) || treePositions.some(p => Math.hypot(x - p.x, z - p.z) < 6)) return;
      treePositions.push({ x, z });
      nature(key, id, x, z, size, yaw, false, true);
      const random = treeRandom(`${id}-undergrowth`);
      const count = random() < 0.35 ? 2 : 1;
      for (let j = 0; j < count; j++) {
        const angle = random() * Math.PI * 2, radius = 1.1 + random() * 2.1;
        const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
        if (!clear(px, pz)) continue;
        const species = ['fern', 'bush', 'shortGrass', 'grass'] as const;
        nature(species[Math.floor(random() * species.length)], `${id}-understory-${j}`, px, pz, 0.9 + random() * 1.5, random() * Math.PI * 2, false);
      }
    };
    const ridgeRandom = treeRandom('kul-ridge-groves');
    for (let i = 0; i < 88; i++) {
      const grove = KUL_RIDGE_GROVES[Math.floor(ridgeRandom() * KUL_RIDGE_GROVES.length)];
      const angle = ridgeRandom() * Math.PI * 2, radius = Math.sqrt(ridgeRandom()) * 37;
      const edge = i % 5 === 0;
      const x = edge ? -326 + ridgeRandom() * 190 : grove.x + Math.cos(angle) * radius;
      const z = edge ? -258 + ridgeRandom() * 516 : grove.z + Math.sin(angle) * radius;
      if (kulRoadDistance(x, z) < 23) continue;
      const kind = ridgeRandom();
      plantTree(kind < 0.13 ? 'deadTree' : kind < 0.35 ? 'broadTree' : kind < 0.61 ? 'pineTall' : 'pine',
        `ridge-tree-${i}`, x, z, 9.5 + ridgeRandom() * 9, ridgeRandom() * Math.PI * 2);
    }
    for (let i = 0; i < 32; i++) {
      const x = 155 + ((i * 43.7) % 165), z = -240 + ((i * 73.3) % 480);
      if (!clear(x, z) || kulRoadDistance(x, z) < 23) continue;
      nature('rock3', `quarry-rock-${i}`, x, z, 4 + i % 5, i * 1.7, true);
      if (i % 4 === 0) plantTree('deadTree', `quarry-tree-${i}`, x - 7, z, 9 + i % 5, i);
    }
    // Seeded groves and sparse outliers replace the former mirrored 7 × 7 lattice.
    const species = ['pine', 'pineTall', 'broadTree'] as const;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const random = treeRandom(`kul-corner-${sx}-${sz}`);
      for (let n = 0; n < 40; n++) {
        const grove = KUL_CORNER_GROVES[Math.floor(random() * KUL_CORNER_GROVES.length)];
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 26;
        const edge = n % 6 === 0;
        const x = sx * (edge ? 243 + random() * 98 : grove.x + Math.cos(angle) * radius);
        const z = sz * (edge ? 243 + random() * 98 : grove.z + Math.sin(angle) * radius);
        plantTree(species[Math.floor(random() * species.length)], `corner-tree-${sx}-${sz}-${n}`,
          x, z, 10 + random() * 9, random() * Math.PI * 2);
      }
    }
    // Low creek-bank vegetation and pebbles leave the graded crossings unobstructed.
    for (const bank of [-1, 1]) for (let i = 0; i < 100; i++) {
      const x = -280 + i * 5.6, z = bank * 102 + Math.sin(x / 58) * 15 + (i % 2 ? 20 : -20);
      if (!clear(x, z)) continue;
      nature(i % 5 === 0 ? 'bush' : 'shortGrass', `creek-plant-${bank}-${i}`, x, z, i % 5 === 0 ? 2.7 : 2.1, i, false);
      if (i % 3 === 0) nature('pebble', `creek-pebble-${bank}-${i}`, x + 1, z + 1, 0.5 + i % 4 * 0.2, i, false);
    }
    for (const [i, p] of [{ x: -108, z: -134 }, { x: 108, z: 134 }, { x: -121, z: 62 }, { x: 121, z: -90 }].entries()) {
      plantTree('deadTree', `field-dead-tree-${i}`, p.x, p.z, 10 + i, i * 1.9);
    }
    // Short, broken paired impressions follow the actual surface instead of floating strips.
    for (const side of [-1, 1]) for (let i = 0; i < 56; i++) {
      const z = -150 + i * 5.4, x = side * 48 + 12 * Math.sin(z / 42);
      if (!clear(x, z)) continue;
      for (const track of [-1, 1]) {
        const px = x + track * 1.45;
        const mark = MeshBuilder.CreateGround(`field-track-${side}-${i}-${track}`, { width: 0.65, height: 2.4, subdivisions: 2 }, scene);
        const positions = mark.getVerticesData('position')!;
        for (let j = 0; j < positions.length; j += 3) positions[j + 1] = kulTerrainHeight(px + positions[j], z + positions[j + 2]) + 0.035;
        mark.updateVerticesData('position', positions); mark.position.set(px, 0, z); mark.material = scuff; mark.isPickable = false; meshes.push(mark);
      }
    }
    optimizeStaticProps(meshes, []);
    return { meshes, shadowCasters: meshes.filter(m => m.isVisible && (m.metadata?.hardCover || m.metadata?.tree)), dispose };
  } catch (error) { dispose(); throw error; }
}
