import { optimizeStaticProps } from './optimizeStaticProps.ts';
import {
  Color3, Matrix, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, Vector3, VertexData,
  type AbstractMesh, type Scene,
} from '@babylonjs/core';
import { seededRandom } from './terrain.ts';
import {
  FILM_ROADS, FUEL_DEPOT, RIVER, RIVER_BRIDGE, RIVER_BROKEN_BRIDGE, RIVER_FORD, VILLAGE, VILLAGE_BUILDINGS,
  filmSetHeight, riverCenterX, riverProfile,
} from './filmSetLayout.ts';

const hex = Color3.FromHexString;
type Placement = [x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw?: number];
type Cover = { surface: 'concrete' | 'metal' | 'wood' };

/**
 * Film set districts west and north of the runway (metres, radians): river with a road bridge, ford and
 * collapsed bridge; village crossroads beyond it; fuel depot between the pad and the airfield.
 * Procedural low-poly blockout — temporary assets until modelled GLBs replace them.
 */
export function createFilmDistricts(scene: Scene) {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [];
  const casters: AbstractMesh[] = [];
  const random = seededRandom(90417);

  const material = (id: string, color: string, emissive?: string) => {
    const m = new StandardMaterial(id, scene);
    m.diffuseColor = hex(color); m.specularColor = Color3.Black();
    if (emissive) { m.emissiveColor = hex(emissive); m.disableLighting = true; }
    materials.push(m); return m;
  };
  const solid = (mesh: Mesh, shape = PhysicsShapeType.BOX) =>
    bodies.push(new PhysicsAggregate(mesh, shape, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  const tag = (mesh: Mesh, cover?: Cover) => {
    mesh.receiveShadows = true; meshes.push(mesh); casters.push(mesh);
    if (cover) mesh.metadata = { district: true, hardCover: true, surface: cover.surface, temporaryAsset: true };
    return mesh;
  };
  const box = (id: string, size: [number, number, number], at: [number, number, number], mat: StandardMaterial,
    rotation: [number, number, number] = [0, 0, 0], cover?: Cover) => {
    const mesh = MeshBuilder.CreateBox(id, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.set(...at); mesh.rotation.set(...rotation); mesh.material = mat; tag(mesh, cover);
    if (cover) solid(mesh);
    return mesh;
  };
  const cylinder = (id: string, diameter: number, height: number, at: [number, number, number], mat: StandardMaterial,
    rotation: [number, number, number] = [0, 0, 0], cover?: Cover, tessellation = 14) => {
    const mesh = MeshBuilder.CreateCylinder(id, { diameter, height, tessellation }, scene);
    mesh.position.set(...at); mesh.rotation.set(...rotation); mesh.material = mat; tag(mesh, cover);
    if (cover) solid(mesh, PhysicsShapeType.CYLINDER);
    return mesh;
  };
  /** One thin-instanced unit mesh per material keeps repeated details to a single draw call. */
  const batch = (id: string, mat: StandardMaterial, items: Placement[], shape: 'box' | 'cylinder' | 'rock' = 'box') => {
    if (!items.length) return;
    const mesh = shape === 'box' ? MeshBuilder.CreateBox(id, { size: 1 }, scene)
      : shape === 'cylinder' ? MeshBuilder.CreateCylinder(id, { diameter: 1, height: 1, tessellation: 8 }, scene)
        : MeshBuilder.CreateIcoSphere(id, { radius: 0.5, subdivisions: 1, flat: true }, scene);
    mesh.material = mat; mesh.isPickable = false; mesh.receiveShadows = true;
    const data = new Float32Array(items.length * 16);
    items.forEach(([x, y, z, sx, sy, sz, yaw = 0], i) =>
      Matrix.Compose(new Vector3(sx, sy, sz), Quaternion.RotationYawPitchRoll(yaw, 0, 0), new Vector3(x, y, z)).copyToArray(data, i * 16));
    mesh.thinInstanceSetBuffer('matrix', data, 16, true);
    meshes.push(mesh); casters.push(mesh);
  };
  /** Gable roof prism, ridge along local Z. Normals point outward; roof materials render both sides. */
  const gable = (id: string, width: number, depth: number, rise: number) => {
    const w = width / 2, d = depth / 2;
    const A = [-w, 0, -d], B = [w, 0, -d], C = [0, rise, -d], D = [-w, 0, d], E = [w, 0, d], F = [0, rise, d];
    const tris = [[A, B, C], [D, F, E], [A, C, F], [A, F, D], [B, E, F], [B, F, C]];
    const positions: number[] = [], normals: number[] = [], indices: number[] = [];
    for (const [a, b, c] of tris) {
      const u = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), v = new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const n = Vector3.Cross(u, v).normalize();
      const centroid = new Vector3((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3 - rise / 3, (a[2] + b[2] + c[2]) / 3);
      if (Vector3.Dot(n, centroid) < 0) n.scaleInPlace(-1);
      for (const p of [a, b, c]) { indices.push(positions.length / 3); positions.push(...p); normals.push(n.x, n.y, n.z); }
    }
    const mesh = new Mesh(id, scene);
    Object.assign(new VertexData(), { positions, normals, indices }).applyToMesh(mesh);
    return mesh;
  };
  /** Local building frame → world (left-handed yaw, same convention as Mesh.rotation.y). */
  const frame = (x: number, z: number, yaw: number) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  };

  const plaster = ['#B8AA8C', '#A99C82', '#C2B59A', '#9E9480', '#B3A07E'].map((c, i) => material(`fd-plaster-${i}`, c));
  const stone = material('fd-stone', '#8C887C');
  const stoneDark = material('fd-stone-dark', '#6F6C63');
  const concrete = material('fd-concrete', '#8A8B82');
  const roofTile = [material('fd-roof-tile', '#8A4F38'), material('fd-roof-slate', '#4E5352'), material('fd-roof-rust', '#6E4A36')];
  roofTile.forEach(m => { m.backFaceCulling = false; });
  const timber = material('fd-timber', '#5C4A36');
  const windowMat = material('fd-window', '#2A3236');
  const doorMat = material('fd-door', '#4A3A2C');
  const steel = material('fd-steel', '#474A46');
  const paintWhite = material('fd-paint', '#D8D3C4');
  const tankWhite = material('fd-tank', '#C9C6B8');
  const tankBand = material('fd-tank-band', '#B4602E');
  const pipeMat = material('fd-pipe', '#9A8F3E');
  const redLamp = material('fd-lamp-red', '#FF3020', '#FF3020');
  const carColors = ['#6E7A5E', '#8C3A2E', '#3E4E5E', '#A89A70'].map((c, i) => material(`fd-car-${i}`, c));
  const water = material('fd-water', '#4F7F8C');
  water.emissiveColor = hex('#1D3A44'); water.specularColor = hex('#9FB8BF'); water.specularPower = 48;
  water.alpha = 0.74; water.backFaceCulling = false; water.zOffset = -2;

  const windows: Placement[] = [], doors: Placement[] = [], posts: Placement[] = [], rails: Placement[] = [];
  const dashes: Placement[] = [], rocks: Placement[] = [], drums: Placement[] = [];

  // ---------- River ----------
  {
    const LATERAL = [-1, -0.5, 0, 0.5, 1];
    const zs = Array.from({ length: Math.round(840 / 4) + 1 }, (_, i) => -420 + i * 4);
    const paths = LATERAL.map(l => zs.map(z => new Vector3(riverCenterX(z) + l * RIVER.waterHalf, RIVER.level, z)));
    const surface = MeshBuilder.CreateRibbon('fd-river', { pathArray: paths }, scene);
    surface.material = water; surface.isPickable = false; surface.metadata = { water: true };
    surface.convertToFlatShadedMesh(); surface.freezeWorldMatrix(); meshes.push(surface);

    // Boulders strewn along both banks; visual only.
    for (let i = 0; i < 140; i++) {
      const z = -380 + random() * 760, side = random() < 0.5 ? -1 : 1;
      if (Math.abs(z - RIVER_BRIDGE.z) < 22 || Math.abs(z - RIVER_FORD.z) < 26) continue;
      const x = riverCenterX(z) + side * (RIVER.innerHalf + random() * (RIVER.bank + 4)), s = 0.5 + random() * 1.3;
      rocks.push([x, filmSetHeight(x, z) + s * 0.2, z, s * 1.3, s * 0.8, s, random() * 6.28]);
    }
  }

  // ---------- Road bridge ----------
  {
    const { z, halfLength, halfWidth, deckY } = RIVER_BRIDGE, cx = riverCenterX(z), bed = -RIVER.depth;
    box('fd-bridge-deck', [halfLength * 2, 0.8, halfWidth * 2 + 1], [cx, deckY - 0.4, z], concrete, [0, 0, 0], { surface: 'concrete' });
    for (const side of [-1, 1]) {
      box(`fd-bridge-parapet-${side}`, [halfLength * 2, 0.9, 0.5], [cx, deckY + 0.45, z + side * (halfWidth + 0.75)], concrete, [0, 0, 0], { surface: 'concrete' });
      box(`fd-bridge-girder-${side}`, [halfLength * 2 - 2, 0.9, 0.8], [cx, deckY - 1.25, z + side * (halfWidth - 1)], stoneDark);
      const pierTop = deckY - 0.8, pierH = pierTop - bed;
      box(`fd-bridge-pier-${side}`, [1.8, pierH, halfWidth * 2 - 0.5], [cx + side * 6, bed + pierH / 2, z], stone, [0, 0, 0], { surface: 'concrete' });
      // Cutwater noses upstream and downstream of each pier.
      box(`fd-bridge-nose-${side}`, [1.3, pierH, 1.3], [cx + side * 6, bed + pierH / 2, z - halfWidth], stone, [0, Math.PI / 4, 0]);
    }
    for (let x = -halfLength + 4; x <= halfLength - 3; x += 7) dashes.push([cx + x, deckY + 0.02, z, 3, 0.04, 0.25]);
  }

  // ---------- Collapsed bridge (cover only) ----------
  {
    const { z, halfLength, halfWidth } = RIVER_BROKEN_BRIDGE, cx = riverCenterX(z), bed = -RIVER.depth;
    const west = filmSetHeight(cx - halfLength - 1, z) + 0.2, east = filmSetHeight(cx + halfLength + 1, z) + 0.2;
    box('fd-wreckbridge-abut-w', [3, 3, halfWidth * 2 + 2], [cx - halfLength, west - 1.5, z], stone, [0, 0, 0], { surface: 'concrete' });
    box('fd-wreckbridge-abut-e', [3, 3, halfWidth * 2 + 2], [cx + halfLength, east - 1.5, z], stone, [0, 0, 0], { surface: 'concrete' });
    const pierH = west - 0.6 - bed;
    box('fd-wreckbridge-pier-w', [1.8, pierH, halfWidth * 2 - 0.5], [cx - 6, bed + pierH / 2, z], stone, [0, 0, 0], { surface: 'concrete' });
    box('fd-wreckbridge-pier-e', [1.8, 2.2, halfWidth * 2 - 0.5], [cx + 6, bed + 1.1, z], stone, [0, 0.12, 0.08], { surface: 'concrete' });
    // Intact western span, ending ragged over the channel.
    const spanW = halfLength + 2;
    box('fd-wreckbridge-span-w', [spanW, 0.7, halfWidth * 2], [cx - halfLength + spanW / 2, west - 0.35, z], concrete, [0, 0, 0], { surface: 'concrete' });
    box('fd-wreckbridge-parapet-w', [spanW, 0.9, 0.4], [cx - halfLength + spanW / 2, west + 0.45, z - halfWidth], concrete, [0, 0, 0], { surface: 'concrete' });
    // Eastern span dropped into the river, resting on the bank.
    const x0 = cx + halfLength - 1, x1 = cx + 1.5, y0 = east - 0.4, y1 = bed + 0.6;
    const len = Math.hypot(x0 - x1, y0 - y1);
    box('fd-wreckbridge-span-e', [len, 0.7, halfWidth * 2], [(x0 + x1) / 2, (y0 + y1) / 2, z + 0.6], concrete,
      [0.06, 0.08, Math.atan2(y0 - y1, x0 - x1)], { surface: 'concrete' });
    for (let i = 0; i < 9; i++) {
      const s = 0.8 + random() * 1.4;
      rocks.push([cx - 2 + random() * 6, bed + s * 0.3, z + (random() - 0.5) * 10, s * 1.6, s, s * 1.2, random() * 6.28]);
    }
  }

  // ---------- Ford: depth poles both sides of the crossing ----------
  {
    const { z } = RIVER_FORD, cx = riverCenterX(z);
    for (const along of [-6, 6]) for (const off of [-14, -5, 5, 14]) {
      const x = cx + off, pz = z + along, y = filmSetHeight(x, pz);
      for (let s = 0; s < 4; s++) posts.push([x, y + 0.25 + s * 0.5, pz, 0.12, 0.5, 0.12]);
    }
    for (let i = 0; i < 26; i++) {
      const pz = z + (random() - 0.5) * 18, x = cx + (random() - 0.5) * 30, s = 0.3 + random() * 0.4;
      rocks.push([x, filmSetHeight(x, pz) + s * 0.15, pz, s * 1.4, s * 0.6, s, random() * 6.28]);
    }
  }

  // ---------- Village crossroads ----------
  const roadNormal = (x: number, z: number): [number, number] =>
    Math.abs(z - VILLAGE.z) < Math.abs(x - VILLAGE.x) ? [0, Math.sign(VILLAGE.z - z)] : [Math.sign(VILLAGE.x - x), 0];
  VILLAGE_BUILDINGS.forEach((b, index) => {
    const at = frame(b.x, b.z, b.yaw), wallH = b.floors * 3, y = 0;
    const plasterMat = plaster[index % plaster.length];
    const cover: Cover = { surface: b.kind === 'barn' ? 'wood' : 'concrete' };
    // Front door faces the nearer road.
    const [nx, nz] = roadNormal(b.x, b.z);
    const faces: [number, number, number][] = [[0, -1, b.depth / 2], [0, 1, b.depth / 2], [-1, 0, b.width / 2], [1, 0, b.width / 2]];
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    const front = faces.reduce((best, f) => {
      const wx = f[0] * c + f[1] * s, wz = -f[0] * s + f[1] * c;
      return wx * nx + wz * nz > best.score ? { face: f, score: wx * nx + wz * nz } : best;
    }, { face: faces[0], score: -Infinity }).face;

    if (b.kind === 'ruin') {
      // Shell of a two-storey house: broken walls, no roof, rubble spilling outward.
      const segs = 3, hs = [[5.4, 3.2, 4.6], [2.2, 4.8, 0], [6, 5.1, 2.8], [3.4, 0.8, 4.2]];
      faces.forEach(([fx, fz, off], wi) => {
        const len = fx ? b.depth : b.width;
        for (let k = 0; k < segs; k++) {
          const h = hs[wi][k]; if (h <= 0) continue;
          const t = (k - 1) * len / segs, [wx, wz] = at(fx ? fx * off : t, fz ? fz * off : t);
          box(`${b.id}-wall-${wi}-${k}`, fx ? [0.5, h, len / segs] : [len / segs, h, 0.5], [wx, y + h / 2, wz], stone, [0, b.yaw, 0], cover);
        }
      });
      const [bx, bz] = at(0.5, 0.5);
      box(`${b.id}-floor`, [b.width - 1, 0.35, b.depth - 1], [bx, y + 3, bz], concrete, [0.05, b.yaw, -0.18], cover);
      box(`${b.id}-beam`, [0.35, 0.35, b.depth + 1], [bx - 1, y + 2.2, bz], timber, [0.6, b.yaw + 0.2, 0]);
      for (let i = 0; i < 14; i++) {
        const [rx, rz] = at((random() - 0.5) * (b.width + 6), (random() - 0.5) * (b.depth + 6)), sz = 0.6 + random() * 1.2;
        rocks.push([rx, y + sz * 0.25, rz, sz * 1.3, sz * 0.7, sz, random() * 6.28]);
      }
      return;
    }

    const [cx, cz] = at(0, 0);
    box(`${b.id}-walls`, [b.width, wallH, b.depth], [cx, y + wallH / 2, cz], b.kind === 'barn' ? timber : plasterMat, [0, b.yaw, 0], cover);
    box(`${b.id}-plinth`, [b.width + 0.2, 0.6, b.depth + 0.2], [cx, y + 0.3, cz], stoneDark, [0, b.yaw, 0]);
    if (b.kind === 'shop') {
      box(`${b.id}-parapet`, [b.width + 0.4, 0.7, b.depth + 0.4], [cx, y + wallH + 0.35, cz], stone, [0, b.yaw, 0]);
      const [sx, sz] = at(front[0] * (front[2] + 0.35), front[1] * (front[2] + 0.35));
      box(`${b.id}-sign`, front[0] ? [0.15, 0.9, b.depth * 0.7] : [b.width * 0.7, 0.9, 0.15], [sx, y + 3.4, sz], carColors[1], [0, b.yaw, 0]);
      const [ax, az] = at(front[0] * (front[2] + 1), front[1] * (front[2] + 1));
      box(`${b.id}-awning`, front[0] ? [2, 0.15, b.depth * 0.8] : [b.width * 0.8, 0.15, 2], [ax, y + 2.7, az], carColors[0], [front[1] * -0.25, b.yaw, front[0] * 0.25]);
    } else {
      const roofW = b.width + 0.9, rise = b.kind === 'barn' ? b.width * 0.45 : b.width * 0.36;
      const roof = gable(`${b.id}-roof`, roofW, b.depth + 0.9, rise);
      roof.position.set(cx, y + wallH, cz); roof.rotation.y = b.yaw;
      roof.material = roofTile[b.kind === 'barn' ? 2 : b.kind === 'church' ? 1 : index % 2]; tag(roof);
      if (b.kind === 'house' && index % 3 !== 1) {
        const [hx, hz] = at(b.width * 0.22, b.depth * 0.2);
        box(`${b.id}-chimney`, [0.8, rise + 1.2, 0.8], [hx, y + wallH + rise * 0.6, hz], stoneDark, [0, b.yaw, 0]);
      }
    }
    if (b.kind === 'church') {
      const [tx, tz] = at(0, -b.depth / 2 - 2.6);
      box(`${b.id}-tower`, [5, 17, 5], [tx, y + 8.5, tz], plasterMat, [0, b.yaw, 0], cover);
      box(`${b.id}-belfry`, [5.4, 0.5, 5.4], [tx, y + 13.5, tz], stone, [0, b.yaw, 0]);
      const spire = MeshBuilder.CreateCylinder(`${b.id}-spire`, { height: 7, diameterTop: 0, diameterBottom: 7, tessellation: 4 }, scene);
      spire.position.set(tx, y + 20.5, tz); spire.rotation.y = b.yaw + Math.PI / 4; spire.material = roofTile[1]; tag(spire);
      box(`${b.id}-cross`, [0.25, 2, 0.25], [tx, y + 25, tz], steel, [0, b.yaw, 0]);
      box(`${b.id}-crossbar`, [1.1, 0.22, 0.22], [tx, y + 25.3, tz], steel, [0, b.yaw, 0]);
      const [ex, ez] = at(0, -b.depth / 2 - 5.15);
      doors.push([ex, y + 1.8, ez, 2, 3, 0.12, b.yaw]);
      // Belfry openings through all four tower faces.
      windows.push([tx, y + 11.5, tz, 1.2, 2, 5.15, b.yaw], [tx, y + 11.5, tz, 5.15, 2, 1.2, b.yaw]);
    }
    // Windows and doors on all four walls; the front gets the door.
    faces.forEach(face => {
      const [fx, fz, off] = face, len = fx ? b.depth : b.width, count = Math.max(1, Math.floor(len / 3.2));
      const isFront = face === front;
      for (let floor = 0; floor < b.floors; floor++) for (let k = 0; k < count; k++) {
        const t = (k - (count - 1) / 2) * (len / count);
        if (isFront && floor === 0 && k === Math.floor(count / 2)) {
          const [dx, dz] = at(fx ? fx * (off + 0.05) : t, fz ? fz * (off + 0.05) : t);
          const dw = b.kind === 'barn' ? 3.4 : b.kind === 'church' ? 2 : 1.1, dh = b.kind === 'barn' ? 3.6 : 2.2;
          doors.push(fx ? [dx, y + dh / 2 + 0.3, dz, 0.12, dh, dw, b.yaw] : [dx, y + dh / 2 + 0.3, dz, dw, dh, 0.12, b.yaw]);
          continue;
        }
        if (b.kind === 'barn' && floor === 0) continue;
        const [wx, wz] = at(fx ? fx * (off + 0.04) : t, fz ? fz * (off + 0.04) : t);
        const wh = b.kind === 'church' ? 2.6 : 1.3, wy = y + floor * 3 + (b.kind === 'church' ? 2.6 : 1.8);
        windows.push(fx ? [wx, wy, wz, 0.1, wh, 1.1, b.yaw] : [wx, wy, wz, 1.1, wh, 0.1, b.yaw]);
      }
    });
  });

  // Monument island at the crossroads and low stone yard walls.
  cylinder('fd-monument-base', VILLAGE.plazaRadius * 2, 0.7, [VILLAGE.x, 0.35, VILLAGE.z], stone, [0, 0, 0], { surface: 'concrete' }, 8);
  box('fd-monument-plinth', [1.6, 1.4, 1.6], [VILLAGE.x, 1.4, VILLAGE.z], stoneDark, [0, 0, 0], { surface: 'concrete' });
  box('fd-monument-obelisk', [0.9, 4.2, 0.9], [VILLAGE.x, 4.2, VILLAGE.z], stone, [0, 0, 0], { surface: 'concrete' });
  const yardWalls: [number, number, number, number][] = [
    [-266, 88, 14, 0], [-298 + 22, 116, 18, Math.PI / 2], [-346, 92, 12, 0], [-350, 108, 22, Math.PI / 2],
    [-262, 30, 14, Math.PI / 2], [-300 - 28, 8, 22, 0], [-345, 28, 12, 0],
  ];
  yardWalls.forEach(([x, z, len, yaw], i) => box(`fd-yardwall-${i}`, [len, 1.1, 0.6], [x, 0.55, z], stone, [0, yaw, 0], { surface: 'concrete' }));

  // Abandoned civilian cars: chassis + cabin blocks.
  const cars: [number, number, number][] = [[-272, 63.5, Math.PI / 2 + 0.1], [-303, 92, 0.15], [-326, 57, -Math.PI / 2 + 0.3], [-297, 26, Math.PI - 0.4]];
  cars.forEach(([x, z, yaw], i) => {
    const at = frame(x, z, yaw), mat = carColors[i % carColors.length];
    box(`fd-car-${i}-body`, [1.8, 0.8, 4.3], [x, 0.65, z], mat, [0, yaw, 0], { surface: 'metal' });
    const [cx, cz] = at(0, -0.3);
    box(`fd-car-${i}-cabin`, [1.6, 0.65, 2.2], [cx, 1.38, cz], mat, [0, yaw, 0]);
    windows.push([cx, 1.38, cz, 1.62, 0.45, 2.0, yaw]);
  });

  // Utility poles along the village roads.
  for (let x = -250; x >= -360; x -= 22) posts.push([x, 4, VILLAGE.z - 7.5, 0.28, 8, 0.28]);
  for (let z = -40; z <= 180; z += 22) if (Math.abs(z - VILLAGE.z) > 10) posts.push([VILLAGE.x + 7, 4, z, 0.28, 8, 0.28]);

  // ---------- Fuel depot ----------
  {
    const D = FUEL_DEPOT, r = D.tankDiameter / 2;
    D.tanks.forEach(({ x, z }, i) => {
      cylinder(`fd-fuel-tank-${i}`, D.tankDiameter, D.tankHeight, [x, D.tankHeight / 2, z], tankWhite, [0, 0, 0], { surface: 'metal' }, 18);
      const roof = MeshBuilder.CreateCylinder(`fd-fuel-roof-${i}`, { height: 1.4, diameterTop: 1.2, diameterBottom: D.tankDiameter + 0.2, tessellation: 18 }, scene);
      roof.position.set(x, D.tankHeight + 0.7, z); roof.material = tankWhite; tag(roof);
      const stripe = MeshBuilder.CreateCylinder(`fd-fuel-band-${i}`, { height: 0.9, diameter: D.tankDiameter + 0.08, tessellation: 18 }, scene);
      stripe.position.set(x, D.tankHeight - 1.6, z); stripe.material = tankBand; tag(stripe);
      box(`fd-fuel-ladder-${i}`, [0.6, D.tankHeight, 0.2], [x + r * 0.7, D.tankHeight / 2, z - r * 0.72], steel, [0, Math.PI / 4, 0]);
    });
    const { bund } = D;
    for (const side of [-1, 1]) {
      box(`fd-bund-x-${side}`, [bund.xMax - bund.xMin, 1.2, 0.6], [(bund.xMin + bund.xMax) / 2, 0.6, side < 0 ? bund.zMin : bund.zMax], concrete, [0, 0, 0], { surface: 'concrete' });
      box(`fd-bund-z-${side}`, [0.6, 1.2, bund.zMax - bund.zMin], [side < 0 ? bund.xMin : bund.xMax, 0.6, (bund.zMin + bund.zMax) / 2], concrete, [0, 0, 0], { surface: 'concrete' });
    }
    // Horizontal pressure tanks on saddles between the road and the bund.
    [60, 76, 92].forEach((x, i) => {
      cylinder(`fd-bullet-${i}`, 3.2, 11, [x, 2.3, 321], tankWhite, [0, 0, Math.PI / 2], { surface: 'metal' });
      for (const dx of [-3.5, 3.5]) box(`fd-bullet-${i}-saddle-${dx}`, [0.8, 1.2, 2.6], [x + dx, 0.6, 321], concrete);
    });
    // Pipe rack from the bund to the truck gantry.
    const rackY = 3.4;
    for (let x = 104; x <= 126; x += 4) {
      for (const dz of [-1.4, 1.4]) box(`fd-rack-post-${x}-${dz}`, [0.3, rackY, 0.3], [x, rackY / 2, 338 + dz], steel, [0, 0, 0], { surface: 'metal' });
      box(`fd-rack-beam-${x}`, [0.3, 0.3, 3.2], [x, rackY, 338], steel);
    }
    [-0.8, 0, 0.8].forEach((dz, i) => cylinder(`fd-pipe-${i}`, 0.45, 70, [91, rackY + 0.35, 338 + dz], pipeMat, [0, 0, Math.PI / 2], undefined, 8));
    // Truck loading gantry: canopy over two lanes with a pump island between them.
    const g = D.gantry;
    box('fd-gantry-roof', [g.width + 1, 0.6, g.depth + 1], [g.x, g.height + 0.3, g.z], steel);
    box('fd-gantry-fascia', [g.width + 1.2, 1, g.depth + 1.2], [g.x, g.height + 1.1, g.z], paintWhite);
    for (const dz of [-g.depth / 2 + 1, g.depth / 2 - 1]) box(`fd-gantry-col-${dz}`, [0.8, g.height, 0.8], [g.x, g.height / 2, g.z + dz], steel, [0, 0, 0], { surface: 'metal' });
    box('fd-gantry-island', [1.6, 0.3, g.depth - 3], [g.x, 0.15, g.z], concrete);
    for (const dz of [-3.5, 3.5]) box(`fd-gantry-pump-${dz}`, [0.9, 1.6, 0.9], [g.x, 1.1, g.z + dz], carColors[1], [0, 0, 0], { surface: 'metal' });
    // Tanker trucks: one loading, one parked by the bullets.
    const trucks: [number, number, number][] = [[g.x - 5, g.z + 1, 0], [g.x + 5, g.z - 5, 0], [112, 318, Math.PI / 2]];
    trucks.forEach(([x, z, yaw], i) => {
      const at = frame(x, z, yaw);
      const [hx, hz] = at(0, 4.2);
      box(`fd-truck-${i}-cab`, [2.5, 2.4, 2.2], [hx, 1.7, hz], carColors[i % 2 ? 2 : 0], [0, yaw, 0], { surface: 'metal' });
      box(`fd-truck-${i}-chassis`, [2.3, 0.6, 10.4], [x, 0.8, z], steel, [0, yaw, 0]);
      const [tx, tz] = at(0, -1.2);
      cylinder(`fd-truck-${i}-tank`, 2.4, 7.4, [tx, 2.3, tz], tankWhite, [Math.PI / 2, yaw, 0], { surface: 'metal' }, 12);
    });
    // Pump house, guard booth, drums and a vent stack with an obstruction light.
    box('fd-pumphouse', [10, 4, 7], [128, 2, 352], plaster[3], [0, 0, 0], { surface: 'concrete' });
    box('fd-pumphouse-roof', [10.6, 0.4, 7.6], [128, 4.2, 352], steel);
    doors.push([128, 1.4, 348.45, 2.4, 2.6, 0.12]);
    box('fd-guard-booth', [3, 2.8, 3], [D.gate.xMin - 3, 1.4, D.area.zMin + 2.5], plaster[0], [0, 0, 0], { surface: 'concrete' });
    windows.push([D.gate.xMin - 3, 1.8, D.area.zMin + 0.97, 2.2, 1, 0.1]);
    box('fd-gate-boom', [D.gate.xMax - D.gate.xMin - 2, 0.15, 0.15], [(D.gate.xMin + D.gate.xMax) / 2, 1.1, D.area.zMin], carColors[1]);
    for (let i = 0; i < 18; i++) drums.push([136 + (i % 6) * 0.7, 0.45 + Math.floor(i / 12) * 0.9, 343 + Math.floor((i % 12) / 6) * 0.7, 0.6, 0.9, 0.6]);
    cylinder('fd-vent-stack', 1.1, 22, [148, 11, 358], steel, [0, 0, 0], { surface: 'metal' }, 8);
    const lamp = MeshBuilder.CreateSphere('fd-vent-light', { diameter: 0.6, segments: 4 }, scene);
    lamp.position.set(148, 22.3, 358); lamp.material = redLamp; lamp.isPickable = false; meshes.push(lamp);
    // Perimeter fence: posts + two rails, visual only (a tank rolls through).
    const { xMin, xMax, zMin, zMax } = D.area;
    const fence = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 3.5)), yaw = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i <= n; i++) posts.push([x0 + (x1 - x0) * i / n, 1.1, z0 + (z1 - z0) * i / n, 0.12, 2.2, 0.12]);
      for (const ry of [0.9, 2.1]) rails.push([(x0 + x1) / 2, ry, (z0 + z1) / 2, 0.06, 0.06, len, yaw]);
    };
    fence(xMin, zMin, D.gate.xMin, zMin); fence(D.gate.xMax, zMin, xMax, zMin);
    fence(xMax, zMin, xMax, zMax); fence(xMax, zMax, xMin, zMax); fence(xMin, zMax, xMin, zMin);
  }

  // Dashed centre lines on asphalt roads (skipped where the road dips into the river).
  for (const road of FILM_ROADS) {
    if (road.kind !== 'asphalt') continue;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], len = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(b.x - a.x, b.z - a.z);
      for (let t = 6; t < len - 3; t += 9) {
        const x = a.x + (b.x - a.x) * t / len, z = a.z + (b.z - a.z) * t / len;
        if (riverProfile(x, z).weight > 0.01 || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 9) continue;
        dashes.push([x, filmSetHeight(x, z) + 0.03, z, 0.22, 0.04, 3, yaw]);
      }
    }
  }

  batch('fd-windows', windowMat, windows);
  batch('fd-doors', doorMat, doors);
  batch('fd-posts', timber, posts, 'cylinder');
  batch('fd-rails', steel, rails);
  batch('fd-dashes', paintWhite, dashes);
  batch('fd-rocks', stoneDark, rocks, 'rock');
  batch('fd-drums', carColors[0], drums, 'cylinder');

  optimizeStaticProps(meshes, casters);
  return {
    meshes, casters,
    dispose() {
      bodies.forEach(b => b.dispose());
      meshes.filter(m => !m.isDisposed()).forEach(m => m.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}
