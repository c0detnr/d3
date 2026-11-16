import { optimizeStaticProps } from './optimizeStaticProps.ts';
import {
  Color3, Matrix, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, Vector3,
  type AbstractMesh, type Scene,
} from '@babylonjs/core';
import { buildFacetedTerrain } from './facetedTerrain.ts';
import { createFilmAirfield } from './createFilmAirfield.ts';
import { createFilmDistricts } from './createFilmDistricts.ts';
import { createKulMountains } from './createKulMountains.ts';
import { seededRandom, terrainNoise } from './terrain.ts';
import {
  AIRFIELD, FILM_BUILDINGS, FILM_LIMIT, FILM_SPAWN, FILM_STEP, FUEL_DEPOT, PAD, RANGE_TARGETS, RIDGE, RIVER, RUNWAY, VILLAGE, WHOOPS,
  airfieldGradeWeight, airfieldPavedWeight, filmSetHeight, padWeight, riverCenterX, riverProfile, roadWeight, runwayWeight, whoopsWeight,
} from './filmSetLayout.ts';
import { factorySources, landmarkSources } from './environmentSources.ts';
import { loadFactoryBuilding } from './loadFactoryBuilding.ts';

const hex = Color3.FromHexString;
const PALETTE = {
  gravel: hex('#A39A82'), rut: hex('#867B63'), dirt: hex('#8C7855'), mud: hex('#6E6150'),
  concrete: hex('#8F8F86'), concreteDark: hex('#7E7F77'), asphalt: hex('#5A5B55'), asphaltDark: hex('#52534D'),
  shoulder: hex('#9A9068'), road: hex('#5E5D56'), roadDark: hex('#56554F'), silt: hex('#6B6450'), pebbles: hex('#837C6C'),
  grass: hex('#8A8656'), khaki: hex('#9C9064'), olive: hex('#6E7347'), rock: hex('#7E7B72'), rockDark: hex('#68665F'),
};

function filmSetShade(x: number, y: number, z: number, up: number, variation: number) {
  const P = PALETTE;
  const patch = terrainNoise(x / 22 + 5, z / 22 - 3) + (variation - 0.5) * 0.16;
  let color: Color3;
  const river = riverProfile(x, z).weight;
  const inArea = (a: { xMin: number; xMax: number; zMin: number; zMax: number }) => x >= a.xMin && x <= a.xMax && z >= a.zMin && z <= a.zMax;
  if (river > 0.55) color = y < RIVER.level + 0.2 ? P.silt : P.pebbles;
  else if (river > 0.05) color = up < 0.84 ? P.rockDark : P.mud;
  else if (roadWeight(x, z, 'asphalt') > 0.5) color = variation < 0.5 ? P.road : P.roadDark;
  else if (roadWeight(x, z, 'track') > 0.5) color = patch > 0.5 ? P.rut : P.dirt;
  else if (inArea(FUEL_DEPOT.area)) color = variation < 0.5 ? P.concrete : P.concreteDark;
  else if (inArea(VILLAGE.area)) color = patch > 0.58 ? P.dirt : patch > 0.3 ? P.grass : P.olive;
  else if (airfieldPavedWeight(x, z) > 0.5) {
    color = x <= AIRFIELD.apron.xMax + 0.5 ? (variation < 0.5 ? P.concrete : P.concreteDark) : (variation < 0.5 ? P.asphalt : P.asphaltDark);
  } else if (airfieldGradeWeight(x, z) > 0.9) color = patch > 0.5 ? P.shoulder : P.khaki;
  else if (padWeight(x, z) > 0.55) color = variation < 0.5 ? P.concrete : P.concreteDark;
  else if (runwayWeight(x, z) > 0.55) color = Math.abs(Math.abs(x) - 2.2) < 0.7 ? P.rut : P.gravel;
  else if (whoopsWeight(x, z) > 0.5) color = patch > 0.55 ? P.mud : P.dirt;
  else if (up < 0.84) color = variation < 0.5 ? P.rock : P.rockDark;
  else if (up < 0.93) color = patch > 0.5 ? P.dirt : P.khaki;
  else color = patch > 0.62 ? P.khaki : patch > 0.36 ? P.grass : P.olive;
  return color.scale(0.95 + variation * 0.08 + Math.min(0, y) * 0.004);
}

/** Open training ground for studio shots (?map=set). Requires an enabled physics scene. */
export async function createFilmSet(scene: Scene, spot: { x: number; z: number } = FILM_SPAWN) {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [];
  const buildings: Awaited<ReturnType<typeof loadFactoryBuilding>>[] = [];
  const random = seededRandom(51723);
  const material = (id: string, color: string) => {
    const m = new StandardMaterial(id, scene);
    m.diffuseColor = hex(color); m.specularColor = Color3.Black(); materials.push(m); return m;
  };
  const solid = (mesh: Mesh, shape = PhysicsShapeType.BOX) => {
    bodies.push(new PhysicsAggregate(mesh, shape, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  };
  const box = (id: string, size: [number, number, number], at: [number, number, number], mat: StandardMaterial, yaw = 0, collide = true) => {
    const mesh = MeshBuilder.CreateBox(id, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.set(...at); mesh.rotation.y = yaw; mesh.material = mat; mesh.receiveShadows = true;
    meshes.push(mesh);
    if (collide) solid(mesh);
    return mesh;
  };
  /** Lowest ground under a footprint, so props never float on a slope. */
  const base = (x: number, z: number, half: number) =>
    Math.min(...[-1, 1].flatMap(dx => [-1, 1].map(dz => filmSetHeight(x + dx * half, z + dz * half))));

  // Physics keeps the 'natural-terrain' name so muzzle dust and impacts treat it as soil.
  const { collider: terrain, visual: facets } = buildFacetedTerrain(scene, {
    name: 'natural-terrain', limit: FILM_LIMIT, step: FILM_STEP, jitter: 0.22, height: filmSetHeight, shade: filmSetShade,
  });
  facets.material = material('film-soil', '#FFFFFF');
  meshes.push(terrain, facets); solid(terrain, PhysicsShapeType.MESH);
  const mountains = createKulMountains(scene, FILM_LIMIT + 60);
  meshes.push(...mountains.meshes); materials.push(mountains.material);

  const concrete = material('film-concrete', '#8A8B80');
  const stripe = material('film-stripe', '#C9852F');
  const white = material('film-white', '#D8D2C2');
  const red = material('film-red', '#9C3B2C');
  const steel = material('film-steel', '#4A4C48');
  const containerColors = ['#5F6748', '#A58F66', '#7A4F36', '#4F5B5E'].map((c, i) => material(`film-container-${i}`, c));
  const rust = material('film-hulk', '#6B4A35');
  const rustDark = material('film-hulk-dark', '#4C3A2E');

  // Concrete barriers stagger along both runway shoulders: parallax for flyby and chase shots.
  for (let z = RUNWAY.zMin + 40, i = 0; z < RUNWAY.zMax - 20; z += 22, i++) {
    const side = i % 2 ? 1 : -1, x = side * (15 + random() * 2), yaw = (random() - 0.5) * 0.25;
    const y = base(x, z, 1.5);
    box(`film-barrier-${i}`, [0.7, 0.95, 3.2], [x, y + 0.47, z], concrete, yaw);
    box(`film-barrier-${i}-stripe`, [0.72, 0.16, 3.22], [x, y + 0.8, z], stripe, yaw, false).isPickable = false;
  }
  // Red/white distance poles every 50 m beside the runway.
  for (let z = RUNWAY.zMin + 35, i = 0; z <= RUNWAY.zMax; z += 50, i++) for (const side of [-1, 1]) {
    for (let s = 0; s < 4; s++) {
      const pole = MeshBuilder.CreateCylinder(`film-pole-${i}-${side}-${s}`, { height: 0.6, diameter: 0.14, tessellation: 6 }, scene);
      pole.position.set(side * 10.5, filmSetHeight(side * 10.5, z) + 0.3 + s * 0.6, z);
      pole.material = s % 2 ? white : red; pole.isPickable = false; meshes.push(pole);
    }
  }

  // Container stacks and drums: depot west of the spawn, one stack by the pad, one by the whoops lane.
  const containers: [number, number, number, number][] = [
    [-28, -186, 0.1, 0], [-28, -186, 0.15, 1], [-31, -173, -0.05, 0], [-42, 205, 1.2, 0], [-38, 214, 1.4, 0], [72, -58, 0.4, 0],
  ];
  containers.forEach(([x, z, yaw, level], i) => {
    const y = base(x, z, 3) + 1.3 + level * 2.6;
    box(`film-container-${i}`, [2.44, 2.6, 6.06], [x, y, z], containerColors[i % containerColors.length], yaw);
  });
  for (let i = 0; i < 9; i++) {
    const x = -22 + (random() - 0.5) * 5, z = -178 + (random() - 0.5) * 5;
    const drum = MeshBuilder.CreateCylinder(`film-drum-${i}`, { height: 0.9, diameter: 0.6, tessellation: 8 }, scene);
    drum.position.set(x, filmSetHeight(x, z) + 0.45, z); drum.material = i % 3 ? containerColors[0] : red;
    drum.receiveShadows = true; meshes.push(drum); solid(drum, PhysicsShapeType.CYLINDER);
  }

  // Watchtower overlooking the start.
  {
    const [x, z] = [26, -138], y = base(x, z, 2);
    for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]])
      box(`film-tower-leg-${dx}-${dz}`, [0.25, 7, 0.25], [x + dx, y + 3.5, z + dz], steel);
    box('film-tower-cabin', [3.4, 2.2, 3.4], [x, y + 8.1, z], containerColors[0]);
    box('film-tower-roof', [4.2, 0.25, 4.2], [x, y + 9.35, z], steel);
  }

  // Range hulks: blocky fictional armour silhouettes facing the pad.
  RANGE_TARGETS.forEach(({ x, z }, i) => {
    const yaw = Math.atan2(PAD.x - x, PAD.z - z) + (i - 1) * 0.35, y = base(x, z, 3.4);
    const q = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
    const at = (local: Vector3) => local.rotateByQuaternionToRef(q, new Vector3()).addInPlace(new Vector3(x, y, z));
    const place = (id: string, size: [number, number, number], local: Vector3, mat: StandardMaterial, collide = true) => {
      const p = at(local); return box(`film-hulk-${i}-${id}`, size, [p.x, p.y, p.z], mat, yaw, collide);
    };
    place('hull', [3.4, 1.5, 6.6], new Vector3(0, 1.15, 0), rust).metadata = { hardCover: true, surface: 'metal' };
    place('turret', [2.4, 0.9, 3.1], new Vector3(0, 2.35, -0.3), rust).metadata = { hardCover: true, surface: 'metal' };
    place('barrel', [0.2, 0.2, 3.6], new Vector3(0, 2.4, 2.9), rustDark, false);
    for (const side of [-1, 1]) place(`track-${side}`, [0.75, 0.85, 6.9], new Vector3(side * 1.55, 0.42, 0), rustDark, false);
  });

  // Pine clusters well outside the lanes; two thin-instanced meshes share one matrix buffer.
  const trunk = MeshBuilder.CreateCylinder('film-pine-trunk', { height: 2.4, diameterTop: 0.22, diameterBottom: 0.38, tessellation: 5 }, scene);
  trunk.material = material('film-bark', '#514A3B');
  const crown = MeshBuilder.CreateCylinder('film-pine-crown', { height: 6.5, diameterTop: 0, diameterBottom: 3.4, tessellation: 6 }, scene);
  crown.material = material('film-pine', '#4A5A3E');
  trunk.position.y = 1.2; crown.position.y = 5.2;
  trunk.bakeCurrentTransformIntoVertices(); crown.bakeCurrentTransformIntoVertices();
  meshes.push(trunk, crown);
  const matrices: number[] = [];
  const clusters = [[-110, -150], [-130, 60], [-95, 150], [105, -170], [130, 40], [95, 100], [-150, -40], [160, -90],
    // River banks, village outskirts and a windbreak behind the fuel depot.
    ...[-300, -200, -30, 140, 300].flatMap(z => [[riverCenterX(z) - 34, z], [riverCenterX(z) + 30, z + 40]]),
    [-370, -30], [-250, 175], [-372, 150], [20, 355], [-60, 330]];
  for (const [cx, cz] of clusters) for (let i = 0; i < 14; i++) {
    const x = cx + (random() - 0.5) * 34, z = cz + (random() - 0.5) * 34;
    if (Math.abs(x - RIDGE.x) < RIDGE.halfWidth + 6 && Math.abs(z - RIDGE.z) < 60) continue;
    if (Math.abs(x - WHOOPS.x) < WHOOPS.halfWidth + 10 && z > WHOOPS.zMin - 10 && z < WHOOPS.zMax + 10) continue;
    if (roadWeight(x, z, undefined, 8) > 0 || riverProfile(x, z).weight > 0) continue;
    const near = (a: { xMin: number; xMax: number; zMin: number; zMax: number }) => x > a.xMin - 6 && x < a.xMax + 6 && z > a.zMin - 6 && z < a.zMax + 6;
    if (near(VILLAGE.area) || near(FUEL_DEPOT.area)) continue;
    const size = 0.75 + random() * 0.6;
    Matrix.Compose(new Vector3(size, size * (0.9 + random() * 0.3), size),
      Quaternion.RotationYawPitchRoll(random() * 6.28, 0, 0), new Vector3(x, filmSetHeight(x, z) - 0.1, z)).copyToArray(matrices, matrices.length);
  }
  for (const mesh of [trunk, crown]) { mesh.thinInstanceSetBuffer('matrix', new Float32Array(matrices), 16, true); mesh.receiveShadows = true; }

  // Invisible boundary inside the rim; the set cannot be left by accident.
  for (const axis of ['x', 'z'] as const) for (const sign of [-1, 1]) {
    const wall = MeshBuilder.CreateBox(`film-boundary-${axis}-${sign}`, { width: axis === 'x' ? 3 : FILM_LIMIT * 2, depth: axis === 'z' ? 3 : FILM_LIMIT * 2, height: 80 }, scene);
    wall.position[axis] = sign * (FILM_LIMIT - 6); wall.position.y = 20; wall.isVisible = false; meshes.push(wall); solid(wall);
  }

  const airfield = createFilmAirfield(scene);
  const districts = createFilmDistricts(scene);

  const casters = meshes.filter(m => m.isVisible && m !== terrain && m !== facets && !mountains.meshes.includes(m));
  optimizeStaticProps(meshes, casters);
  const ground = {
    spawn: new Vector3(spot.x, filmSetHeight(spot.x, spot.z), spot.z),
    /** Smoke supply crates sit at the depot, out of every lane. */
    supplyAnchor: new Vector3(-60, 0, -205),
    terrain, meshes: [...meshes, ...airfield.meshes, ...districts.meshes],
    shadowCasters: [...casters, ...airfield.casters, ...districts.casters] as AbstractMesh[],
    dispose() { airfield.dispose(); districts.dispose(); buildings.forEach(b => b.dispose()); bodies.forEach(b => b.dispose()); meshes.filter(m => !m.isDisposed()).forEach(m => m.dispose()); materials.forEach(m => m.dispose()); },
  };
  try {
    const sources = { ...factorySources, ...landmarkSources };
    for (const structure of FILM_BUILDINGS) {
      const building = await loadFactoryBuilding(scene, sources[structure.kind], structure, filmSetHeight);
      buildings.push(building);
      optimizeStaticProps(building.meshes, building.shadowCasters);
      ground.meshes.push(...building.meshes);
      ground.shadowCasters.push(...building.shadowCasters);
    }
    return ground;
  } catch (error) { ground.dispose(); throw error; }
}
