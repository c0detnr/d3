import { Color3, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, StandardMaterial, Vector3, VertexData, type Scene } from '@babylonjs/core';
import { KUL_LIMIT, KUL_STEP, KUL_ROAD_WIDTH, KUL_SPAWNS, KUL_STRUCTURES, kulRoadDistance, kulTerrainHeight } from './kulVadisiLayout.ts';
import { createTerrainSurfaceTextures, TERRAIN_TEXTURE_METERS } from './terrainSurfaceTextures.ts';

/** K1 blockout. Solid volumes are temporary hard cover; no objective/repair logic. */
export function createKulVadisi(scene: Scene, team: 'A' | 'B' = 'A') {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [];
  const material = (id: string, color: string) => {
    const m = new StandardMaterial(id, scene);
    m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black(); materials.push(m); return m;
  };
  const soil = material('kul-soil', '#FFFFFF');
  const surface = createTerrainSurfaceTextures(scene);
  soil.diffuseTexture = surface.albedo; soil.bumpTexture = surface.normal;
  soil.detailMap.texture = surface.detail; soil.detailMap.isEnabled = true;
  soil.detailMap.diffuseBlendLevel = 0.42; soil.detailMap.bumpLevel = 0.5;
  const solid = (mesh: Mesh) => {
    bodies.push(new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  };
  const terrain = new Mesh('natural-terrain', scene); terrain.material = soil; terrain.receiveShadows = true; meshes.push(terrain);
  const positions: number[] = [], indices: number[] = [], normals: number[] = [], colors: number[] = [], uvs: number[] = [];
  const row = KUL_LIMIT * 2 / KUL_STEP + 1;
  const grass = Color3.FromHexString('#73785A'), rock = Color3.FromHexString('#828575'), road = Color3.FromHexString('#BDAB8B');
  for (let z = -KUL_LIMIT; z <= KUL_LIMIT; z += KUL_STEP) for (let x = -KUL_LIMIT; x <= KUL_LIMIT; x += KUL_STEP) {
    positions.push(x, kulTerrainHeight(x, z), z); uvs.push(x / TERRAIN_TEXTURE_METERS, z / TERRAIN_TEXTURE_METERS);
    const base = Color3.Lerp(grass, rock, Math.max(0, Math.min(1, (x + 60) / 210)));
    const c = Color3.Lerp(base, road, Math.max(0, Math.min(1, (KUL_ROAD_WIDTH / 2 + 3 - kulRoadDistance(x, z)) / 4)));
    colors.push(c.r, c.g, c.b, 1);
  }
  for (let z = 0; z < row - 1; z++) for (let x = 0; x < row - 1; x++) {
    const a = z * row + x; indices.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); Object.assign(data, { positions, indices, normals, colors, uvs }); data.applyToMesh(terrain); solid(terrain);
  const concrete = material('kul-concrete', '#828575'), hangar = material('kul-hangar', '#56615B');
  const teams = { A: material('kul-team-A', '#84AEBC'), B: material('kul-team-B', '#BA7959') };
  const marker = material('kul-neutral-marker', '#D5C7AB');
  for (const s of KUL_STRUCTURES) {
    const mesh = MeshBuilder.CreateBox(s.id, { width: s.width, depth: s.depth, height: s.height }, scene);
    // Base of large placeholders is embedded so sloped terrain leaves no underpass.
    const y = Math.min(...[-1, 1].flatMap(dx => [-1, 1].map(dz => kulTerrainHeight(s.x + dx * s.width / 2, s.z + dz * s.depth / 2))));
    mesh.position.set(s.x, y + s.height / 2, s.z);
    mesh.material = s.kind === 'hangar' ? hangar : concrete; mesh.receiveShadows = true;
    mesh.metadata = { blockout: true, structure: s.id, kind: s.kind, hardCover: true, surface: s.kind === 'berm' ? 'soil' : s.kind === 'hangar' ? 'metal' : 'concrete' };
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
  return {
    spawn: new Vector3(start.x, kulTerrainHeight(start.x, start.z), start.z), terrain, meshes,
    shadowCasters: meshes.filter(m => m.isVisible && m !== terrain),
    dispose() { bodies.forEach(b => b.dispose()); meshes.forEach(m => m.dispose()); materials.forEach(m => m.dispose()); surface.dispose(); },
  };
}
