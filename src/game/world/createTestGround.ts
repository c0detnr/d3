import {
  Color3, Matrix, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion,
  StandardMaterial, Vector3, VertexData, Mesh, type Scene,
} from '@babylonjs/core';
import {
  pathWeight, seededRandom, smooth, terrainHeight, terrainNoise, terrainRim, terrainSlope,
  TERRAIN_LIMIT, TERRAIN_SPAWN,
} from './terrain.ts';
import { createTerrainSurfaceTextures, TERRAIN_TEXTURE_METERS } from './terrainSurfaceTextures.ts';

/** Original procedural environment; metres. Requires an enabled physics scene. */
export function createTestGround(scene: Scene) {
  const bodies: PhysicsAggregate[] = [];
  const meshes: Mesh[] = [];
  const materials: StandardMaterial[] = [];
  const random = seededRandom(72941);
  const material = (name: string, hex: string) => {
    const mat = new StandardMaterial(name, scene);
    mat.diffuseColor = Color3.FromHexString(hex);
    mat.specularColor = Color3.Black();
    materials.push(mat);
    return mat;
  };
  const soil = material('earth-vertex-colors', '#FFFFFF');
  // Original generated soil albedo/normal pair, modulated by the world-space vertex patches.
  const surface = createTerrainSurfaceTextures(scene);
  soil.diffuseTexture = surface.albedo;
  soil.bumpTexture = surface.normal;
  soil.detailMap.texture = surface.detail;
  soil.detailMap.isEnabled = true;
  soil.detailMap.diffuseBlendLevel = 0.42;
  soil.detailMap.bumpLevel = 0.5;
  soil.specularColor = new Color3(0.035, 0.032, 0.028);
  soil.specularPower = 22;
  const bark = material('weathered-bark', '#514A3B');
  const pine = material('pine-needles', '#424F39');
  const leaves = material('dusty-olive-leaves', '#66704B');
  const stone = material('weathered-stone', '#898878');
  const grass = material('dry-meadow-grass', '#89886A');
  grass.backFaceCulling = false;
  const add = (mesh: Mesh, mat: StandardMaterial) => {
    mesh.material = mat;
    mesh.receiveShadows = true;
    meshes.push(mesh);
    return mesh;
  };
  const collide = (mesh: Mesh, shape = PhysicsShapeType.MESH) => {
    bodies.push(new PhysicsAggregate(mesh, shape,
      { mass: 0, friction: 0.85, restitution: 0 }, scene));
  };

  // Fine 2 m surface around the clearing; coarser rings continue to the horizon.
  // One continuous mesh prevents overlapping ground and mismatched visual/collision heights.
  const coordinates = [-600, -540, -480, -418, -372, -335, -300, -280, -260, -243, -228, -215, -204, -194, -185, -177, -170, -164];
  for (let p = -TERRAIN_LIMIT; p <= TERRAIN_LIMIT; p += 2) coordinates.push(p);
  coordinates.push(164, 170, 177, 185, 194, 204, 215, 228, 243, 260, 280, 300, 335, 372, 418, 480, 540, 600);
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  for (const z of coordinates) for (const x of coordinates) {
    positions.push(x, terrainHeight(x, z), z);
    uvs.push(x / TERRAIN_TEXTURE_METERS, z / TERRAIN_TEXTURE_METERS);
  }
  const row = coordinates.length;
  for (let z = 0; z < row - 1; z++) for (let x = 0; x < row - 1; x++) {
    const a = z * row + x, b = a + 1, c = a + row, d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const colors: number[] = [];
  const dry = Color3.FromHexString('#9F9276');
  const meadow = Color3.FromHexString('#73785A');
  const dirt = Color3.FromHexString('#A39272');
  const scree = Color3.FromHexString('#A39B86');
  const cliffRock = Color3.FromHexString('#5E6058');
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i + 2];
    const ny = Math.max(0.05, normals[i + 1]);
    const slope = Math.sqrt(Math.max(0, 1 - ny * ny)) / ny;
    const patch = terrainNoise(x / 17 + 14, z / 17) * 0.65
      + terrainNoise(x / 48, z / 48 + 10) * 0.35;
    const forest = Math.max(0, Math.min(1, (z + 10) / 100));
    let color = Color3.Lerp(dry, meadow, Math.min(0.9, patch * 0.8 + forest * 0.3));
    color = Color3.Lerp(color, scree, smooth((slope - 0.32) / 0.3) * 0.55);
    color = Color3.Lerp(color, cliffRock, smooth((slope - 0.62) / 0.5));
    const trail = pathWeight(x, z) * (0.72 + terrainNoise(x * 0.8 + 2, z * 0.8 - 5) * 0.55);
    const worn = Color3.Lerp(color, dirt, Math.min(1, trail) * 0.9);
    const variation = 0.92 + terrainNoise(x * 1.6, z * 1.6) * 0.12;
    colors.push(worn.r * variation, worn.g * variation, worn.b * variation, 1);
  }
  const terrain = add(new Mesh('natural-terrain', scene), soil);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.colors = colors;
  data.uvs = uvs;
  data.normals = normals;
  data.applyToMesh(terrain);
  collide(terrain);

  // A small original test berm beside the clearing: 7° cross-slope, feathered entries.
  const slope = add(new Mesh('side-slope-test', scene), material('test-berm-soil', '#9F9276'));
  const slopePositions: number[] = [], slopeIndices: number[] = [];
  const slopeZ = [-12, -9, 9, 12];
  for (const z of slopeZ) for (const x of [-6, 6]) {
    const wx = -55 + x, wz = -42 + z;
    const blend = Math.abs(z) === 12 ? 0 : 1;
    slopePositions.push(wx, terrainHeight(wx, wz) + 0.04 + (x + 6) * 0.125 * blend, wz);
  }
  for (let z = 0; z < 3; z++) { const a = z * 2; slopeIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const slopeData = new VertexData();
  slopeData.positions = slopePositions; slopeData.indices = slopeIndices;
  const slopeNormals: number[] = []; VertexData.ComputeNormals(slopePositions, slopeIndices, slopeNormals);
  slopeData.normals = slopeNormals; slopeData.applyToMesh(slope); collide(slope);

  // Reused geometry and matrix buffers keep the forest draw count small.
  const trunk = add(MeshBuilder.CreateCylinder('forest-trunks',
    { height: 1, diameterTop: 0.4, diameterBottom: 0.75, tessellation: 7 }, scene), bark);
  const pineParts: Mesh[] = [];
  for (let layer = 0; layer < 4; layer++) {
    const part = MeshBuilder.CreateCylinder(`pine-layer-${layer}`, {
      height: 3.9 - layer * 0.45, diameterTop: 0.12,
      diameterBottom: 6.5 - layer * 1.25, tessellation: 9,
    }, scene);
    part.position.y = 4 + layer * 1.9;
    part.rotation.y = layer * 0.7;
    pineParts.push(part);
  }
  const pineCrown = add(Mesh.MergeMeshes(pineParts, true)!, pine);
  pineCrown.name = 'pine-crowns';
  const broadParts: Mesh[] = [];
  for (let part = 0; part < 5; part++) {
    const crown = MeshBuilder.CreateIcoSphere(`leaf-cluster-${part}`,
      { radius: 2.6, subdivisions: 1, flat: true }, scene);
    crown.position.set(Math.cos(part * 2.4) * 1.8, 7 + (part % 3) * 0.9, Math.sin(part * 2.4) * 1.7);
    crown.scaling.y = 0.85;
    broadParts.push(crown);
  }
  const broadCrown = add(Mesh.MergeMeshes(broadParts, true)!, leaves);
  broadCrown.name = 'broadleaf-crowns';
  const trunkMatrices: number[] = [], pineMatrices: number[] = [], broadMatrices: number[] = [];
  const treePositions: { x: number; z: number; height: number }[] = [];
  const matrix = (target: number[], x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number) => {
    const transform = Matrix.Compose(new Vector3(sx, sy, sz), Quaternion.RotationYawPitchRoll(yaw, 0, 0), new Vector3(x, y, z));
    target.push(...transform.asArray());
  };
  for (let attempt = 0; attempt < 1800 && treePositions.length < 380; attempt++) {
    const x = (random() - 0.5) * 350;
    const z = -35 + random() * 245;
    const forestEdge = 18 + 17 * Math.sin(x * 0.035) + 8 * Math.sin(x * 0.11);
    if (z < forestEdge && random() > 0.035) continue;
    if (pathWeight(x, z) > 0.12 || Math.hypot(x + 34, z + 42) < 29) continue;
    const rim = terrainRim(x, z);
    if (rim.radius > rim.edge - 3 || terrainSlope(x, z) > 0.8) continue;
    if (treePositions.some(tree => Math.hypot(tree.x - x, tree.z - z) < 5)) continue;
    const scale = 0.8 + random() * 0.75;
    const y = terrainHeight(x, z) - 0.12;
    const yaw = random() * Math.PI * 2;
    const isPine = random() < 0.7;
    matrix(trunkMatrices, x, y + scale * 3.8, z, scale, scale * 7.6, scale, yaw);
    matrix(isPine ? pineMatrices : broadMatrices, x, y, z, scale, scale * (0.92 + random() * 0.22), scale, yaw);
    treePositions.push({ x, z, height: y + scale * 10 });
    // Nearby trunks are solid; distant forest is a visual backdrop for this M1 scene.
    if (Math.abs(x) < 115 && z < 130) {
      const collider = MeshBuilder.CreateCylinder(`tree-collider-${treePositions.length}`,
        { height: scale * 7.6, diameter: scale * 0.7, tessellation: 6 }, scene);
      collider.position.set(x, y + scale * 3.8, z);
      collider.isVisible = false;
      meshes.push(collider);
      collide(collider, PhysicsShapeType.CYLINDER);
    }
  }
  trunk.thinInstanceSetBuffer('matrix', new Float32Array(trunkMatrices), 16, true);
  pineCrown.thinInstanceSetBuffer('matrix', new Float32Array(pineMatrices), 16, true);
  broadCrown.thinInstanceSetBuffer('matrix', new Float32Array(broadMatrices), 16, true);

  const rockSource = add(MeshBuilder.CreateIcoSphere('rock-source',
    { radius: 1, subdivisions: 1, flat: true }, scene), stone);
  // Shared irregular geometry, with independently rotated and scaled boulders.
  const rockVertices = rockSource.getVerticesData('position')!;
  for (let i = 0; i < rockVertices.length; i += 3) {
    const amount = 0.8 + random() * 0.4;
    rockVertices[i] *= amount;
    rockVertices[i + 1] *= amount;
    rockVertices[i + 2] *= amount;
  }
  rockSource.updateVerticesData('position', rockVertices);
  rockSource.isVisible = false;
  for (let i = 0; i < 48; i++) {
    const x = (random() - 0.5) * 235, z = (random() - 0.45) * 230;
    if (pathWeight(x, z) > 0.2 || Math.hypot(x + 34, z + 42) < 17) continue;
    const rim = terrainRim(x, z);
    if (rim.radius > rim.edge - 4) continue;
    const rock = add(rockSource.clone(`boulder-${i}`)!, stone);
    rock.isVisible = true;
    const size = 0.5 + random() * 1.9;
    rock.scaling.set(size * 1.5, size * 0.65, size);
    rock.position.set(x, terrainHeight(x, z) + size * 0.15, z);
    rock.rotation.set(random() * 0.3, random() * 6.28, random() * 0.3);
    collide(rock);
  }

  // Fallen blocks gather at the foot of the escarpment; unreachable, so visual only.
  for (let i = 0; i < 28; i++) {
    const angle = random() * Math.PI * 2;
    const rim = terrainRim(Math.cos(angle) * 150, Math.sin(angle) * 150);
    const radius = rim.edge + rim.faceWidth * 3.4 + random() * 24;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const rock = add(rockSource.clone(`talus-${i}`)!, stone);
    rock.isVisible = true;
    const size = 0.9 + random() * 2.6;
    rock.scaling.set(size * 1.4, size * 0.72, size);
    rock.position.set(x, terrainHeight(x, z) + size * 0.2, z);
    rock.rotation.set(random() * 0.5, random() * 6.28, random() * 0.5);
  }

  const tuft = add(new Mesh('meadow-tufts', scene), grass);
  const tuftData = new VertexData();
  const tuftPositions: number[] = [], tuftIndices: number[] = [];
  for (let blade = 0; blade < 5; blade++) {
    const yaw = blade * 2.4;
    const x = Math.cos(yaw) * 0.16, z = Math.sin(yaw) * 0.16;
    const start = tuftPositions.length / 3;
    tuftPositions.push(x - 0.09, 0, z, x + 0.09, 0, z, x + 0.15, 0.45 + (blade % 3) * 0.12, z + 0.13);
    tuftIndices.push(start, start + 2, start + 1);
  }
  tuftData.positions = tuftPositions;
  tuftData.indices = tuftIndices;
  const tuftNormals: number[] = [];
  VertexData.ComputeNormals(tuftPositions, tuftIndices, tuftNormals);
  tuftData.normals = tuftNormals;
  tuftData.applyToMesh(tuft);
  const grassMatrices: number[] = [];
  for (let i = 0; i < 2200; i++) {
    const x = (random() - 0.5) * 250, z = (random() - 0.45) * 250;
    if (pathWeight(x, z) > 0.25 || Math.hypot(x + 34, z + 42) < 7) continue;
    if (terrainSlope(x, z) > 0.62) continue;
    const size = 0.6 + random() * 1.4;
    matrix(grassMatrices, x, terrainHeight(x, z) - 0.06, z, size, size, size, random() * 6.28);
  }
  tuft.thinInstanceSetBuffer('matrix', new Float32Array(grassMatrices), 16, true);

  return {
    spawn: new Vector3(TERRAIN_SPAWN.x, 0, TERRAIN_SPAWN.z),
    terrain,
    treePositions,
    shadowCasters: [trunk, pineCrown, broadCrown, ...meshes.filter(mesh => mesh.name.startsWith('boulder-'))],
    meshes,
    dispose() {
      bodies.forEach(body => body.dispose());
      meshes.forEach(mesh => mesh.dispose());
      materials.forEach(mat => mat.dispose());
      surface.dispose();
    },
  };
}
