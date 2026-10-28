import { createKulBattlefield, type fieldSources } from './createKulBattlefield.ts';
import { Color3, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { KUL_CONNECTIONS, KUL_LIMIT, KUL_STEP, KUL_ROAD_WIDTH, KUL_SPAWNS, KUL_STRUCTURES, kulRoadDistance, kulTerrainHeight, segmentDistance } from './kulVadisiLayout.ts';
import { loadFactoryBuilding } from './loadFactoryBuilding.ts';
import { buildFacetedTerrain } from './facetedTerrain.ts';
import { terrainNoise } from './terrain.ts';
import { createKulMountains } from './createKulMountains.ts';

const factorySources = {
  hangar: new URL('../../../assets/environment/maintenance_hangar_01/maintenance_hangar_01.glb', import.meta.url).href,
  workshop: new URL('../../../assets/environment/maintenance_workshop_01/maintenance_workshop_01.glb', import.meta.url).href,
};

const hex = Color3.FromHexString;
/** Industrial low-poly palette: few flat tones, picked per facet by zone and slope. */
const KUL_PALETTE = {
  grass: hex('#78794B'), grassDeep: hex('#636841'), forest: hex('#596340'),
  dirt: hex('#8C7855'), ash: hex('#7A746A'), road: hex('#A99470'),
  mud: hex('#5E5444'), rock: hex('#7E7B72'), rockDark: hex('#68665F'),
};
function kulFacetShade(x: number, y: number, z: number, up: number, variation: number) {
  const P = KUL_PALETTE;
  const roadDistance = kulRoadDistance(x, z);
  const creekDistance = Math.min(...KUL_CONNECTIONS.map(c => {
    let d = Infinity;
    for (let i = 1; i < c.points.length; i++) d = Math.min(d, segmentDistance({ x, z }, c.points[i - 1], c.points[i]));
    return d;
  }));
  const patch = terrainNoise(x / 26 + 3, z / 26 - 8) + (variation - 0.5) * 0.18;
  let color: Color3;
  if (up < 0.82) color = variation < 0.5 ? P.rock : P.rockDark;
  else if (creekDistance < KUL_ROAD_WIDTH / 2 + 2 + patch * 4) color = P.mud;
  else if (roadDistance < KUL_ROAD_WIDTH / 2 + patch * 3) color = P.road;
  else if (up < 0.9) color = patch > 0.5 ? P.dirt : P.rock;
  else if (x > 150) color = patch > 0.55 ? P.rock : P.dirt; // quarry
  else if (x < -150) color = patch > 0.42 ? P.forest : P.grassDeep; // wooded ridge
  else if (Math.abs(x) < 70 && Math.abs(z) < 170) color = patch > 0.6 ? P.ash : patch > 0.38 ? P.dirt : P.grass; // battlefield
  else color = patch > 0.62 ? P.dirt : patch > 0.3 ? P.grass : P.grassDeep;
  return color.scale(0.95 + variation * 0.08 + Math.min(0, y) * 0.004);
}

/** K1 terrain with ready-made base/factory buildings; no objective/repair logic. */
export async function createKulVadisi(scene: Scene, team: 'A' | 'B' = 'A', sources: { hangar: string | Uint8Array; workshop: string | Uint8Array; emplacement?: string | Uint8Array } = factorySources, natureSources?: Record<keyof typeof fieldSources, string | Uint8Array>) {
  let battlefield: Awaited<ReturnType<typeof createKulBattlefield>> | undefined;
  const buildings: Awaited<ReturnType<typeof loadFactoryBuilding>>[] = [];
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [];
  const material = (id: string, color: string) => {
    const m = new StandardMaterial(id, scene);
    m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black(); materials.push(m); return m;
  };
  const soil = material('kul-soil', '#FFFFFF');
  const solid = (mesh: Mesh) => {
    bodies.push(new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  };
  // Physics keeps the 'natural-terrain' name; the flat-shaded facets are visual only.
  const { collider: terrain, visual: facets } = buildFacetedTerrain(scene, {
    name: 'natural-terrain', limit: KUL_LIMIT, step: KUL_STEP, jitter: 0.3, height: kulTerrainHeight, shade: kulFacetShade,
  });
  facets.material = soil; meshes.push(terrain, facets); solid(terrain);
  const mountains = createKulMountains(scene, KUL_LIMIT);
  meshes.push(...mountains.meshes); materials.push(mountains.material);
  const concrete = material('kul-concrete', '#828575');
  const teams = { A: material('kul-team-A', '#84AEBC'), B: material('kul-team-B', '#BA7959') };
  const marker = material('kul-neutral-marker', '#D5C7AB');
  for (const s of KUL_STRUCTURES) {
    if (s.kind === 'hangar' || s.kind === 'workshop') continue;
    const mesh = MeshBuilder.CreateBox(s.id, { width: s.width, depth: s.depth, height: s.height }, scene);
    // Base of large placeholders is embedded so sloped terrain leaves no underpass.
    const y = Math.min(...[-1, 1].flatMap(dx => [-1, 1].map(dz => kulTerrainHeight(s.x + dx * s.width / 2, s.z + dz * s.depth / 2))));
    mesh.position.set(s.x, y + s.height / 2, s.z);
    mesh.material = concrete; mesh.receiveShadows = true;
    mesh.metadata = { blockout: true, structure: s.id, kind: s.kind, hardCover: true, surface: s.kind === 'berm' ? 'soil' : 'concrete' };
    meshes.push(mesh); solid(mesh);
    if (s.kind !== 'berm') {
      const strip = MeshBuilder.CreateBox(`${s.id}-mark`, { width: s.width * 0.8, depth: s.depth * 0.8, height: 0.12 }, scene);
      strip.position.set(s.x, y + s.height + 0.08, s.z); strip.material = s.team ? teams[s.team] : marker;
      strip.isPickable = false; meshes.push(strip);
    }
  }
  // Invisible boundary behind the raised rim; the K1 test area cannot be left accidentally.
  for (const axis of ['x', 'z'] as const) for (const sign of [-1, 1]) {
    const wall = MeshBuilder.CreateBox(`kul-boundary-${axis}-${sign}`, { width: axis === 'x' ? 3 : 723, depth: axis === 'z' ? 3 : 723, height: 100 }, scene);
    wall.position[axis] = sign * 360; wall.position.y = 30; wall.isVisible = false; meshes.push(wall); solid(wall);
  }
  const start = KUL_SPAWNS[team];
  const ground = {
    spawn: new Vector3(start.x, kulTerrainHeight(start.x, start.z), start.z), terrain, meshes,
    shadowCasters: meshes.filter(m => m.isVisible && m !== terrain && m !== facets && !mountains.meshes.includes(m)),
    dispose() { battlefield?.dispose(); buildings.forEach(b => b.dispose()); bodies.forEach(b => b.dispose()); meshes.forEach(m => m.dispose()); materials.forEach(m => m.dispose()); },
  };
  try {
    for (const structure of KUL_STRUCTURES) {
      if (structure.kind !== 'hangar' && structure.kind !== 'workshop') continue;
      const building = await loadFactoryBuilding(scene, sources[structure.kind], structure);
      buildings.push(building);
      ground.shadowCasters.push(...building.shadowCasters);
    }
    battlefield = await createKulBattlefield(scene, natureSources, sources.emplacement);
    ground.shadowCasters.push(...battlefield.shadowCasters);
    return ground;
  } catch (error) { ground.dispose(); throw error; }
}
