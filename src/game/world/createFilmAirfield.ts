import { optimizeStaticProps } from './optimizeStaticProps.ts';
import {
  Color3, GlowLayer, Matrix, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, Vector3,
  type AbstractMesh, type Observer, type Scene,
} from '@babylonjs/core';
import { AIRFIELD, AIRFIELD_FUEL, AIRFIELD_HANGARS, AIRFIELD_STANDS, AIRFIELD_TOWER } from './filmSetLayout.ts';

const hex = Color3.FromHexString;
type Placement = [x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw?: number];

/**
 * Procedural military airfield for the film set (metres, radians). Ground is already graded to y = 0
 * by filmSetHeight. Markings and lights are thin instances; lights are emissive only (no scene lights)
 * and glow through a GlowLayer limited to the light meshes. Aircraft are added later on AIRFIELD_STANDS.
 */
export function createFilmAirfield(scene: Scene) {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [];
  const casters: AbstractMesh[] = [];
  const lightMeshes: Mesh[] = [];

  const material = (id: string, color: string, emissive?: string) => {
    const m = new StandardMaterial(id, scene);
    m.diffuseColor = hex(color); m.specularColor = Color3.Black();
    if (emissive) { m.emissiveColor = hex(emissive); m.disableLighting = true; }
    materials.push(m); return m;
  };
  const solid = (mesh: Mesh, shape = PhysicsShapeType.BOX) =>
    bodies.push(new PhysicsAggregate(mesh, shape, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  const box = (id: string, size: [number, number, number], at: [number, number, number], mat: StandardMaterial,
    rotation: [number, number, number] = [0, 0, 0], collide = true) => {
    const mesh = MeshBuilder.CreateBox(id, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.set(...at); mesh.rotation.set(...rotation); mesh.material = mat; mesh.receiveShadows = true;
    meshes.push(mesh); casters.push(mesh);
    if (collide) solid(mesh);
    return mesh;
  };
  /** One thin-instanced unit mesh per material: markings and light fixtures stay a handful of draw calls. */
  const batch = (id: string, mat: StandardMaterial, items: Placement[], shape: 'box' | 'sphere' = 'box', light = false) => {
    const mesh = shape === 'box' ? MeshBuilder.CreateBox(id, { size: 1 }, scene) : MeshBuilder.CreateSphere(id, { diameter: 1, segments: 4 }, scene);
    mesh.material = mat; mesh.isPickable = false; mesh.receiveShadows = !light;
    const data = new Float32Array(items.length * 16);
    items.forEach(([x, y, z, sx, sy, sz, yaw = 0], i) =>
      Matrix.Compose(new Vector3(sx, sy, sz), Quaternion.RotationYawPitchRoll(yaw, 0, 0), new Vector3(x, y, z)).copyToArray(data, i * 16));
    mesh.thinInstanceSetBuffer('matrix', data, 16, true);
    meshes.push(mesh); if (light) lightMeshes.push(mesh);
    return mesh;
  };

  const { runway, taxiway, links, linkHalfWidth, apron, approachLength } = AIRFIELD;
  const paint = material('af-paint-white', '#E4E1D6');
  const yellow = material('af-paint-yellow', '#D9A82E');
  const concrete = material('af-concrete', '#8E8D83');
  const shelterMat = material('af-shelter', '#6D7160');
  const hallMat = material('af-hall', '#5E6656');
  const roofMat = material('af-roof', '#4C5248');
  const steel = material('af-steel', '#3F423E');
  const doorMat = material('af-door', '#55594F');
  const tankMat = material('af-fuel', '#B9B6A6');
  const glass = material('af-glass', '#1E2A30', '#2E4A55');
  const lamp = {
    white: material('af-lamp-white', '#FFFFFF', '#FFF6DC'),
    green: material('af-lamp-green', '#3CFF6A', '#3CFF6A'),
    red: material('af-lamp-red', '#FF3020', '#FF3020'),
    blue: material('af-lamp-blue', '#3A6BFF', '#4C7DFF'),
    amber: material('af-lamp-amber', '#FFB040', '#FFB347'),
    flood: material('af-lamp-flood', '#FFE7B0', '#FFE7B8'),
  };
  const sockOrange = material('af-sock-orange', '#E2662A');

  // ---------- Markings (0.04 m thick, just above the graded ground) ----------
  const MY = 0.03, MT = 0.04;
  const white: Placement[] = [], lines: Placement[] = [];
  const rx = runway.x, rl = runway.zMax - runway.zMin;
  for (const side of [-1, 1]) white.push([rx + side * (runway.halfWidth - 1), MY, 0, 0.9, MT, rl, 0]);
  for (let z = runway.zMin + 90; z < runway.zMax - 120; z += 50) white.push([rx, MY, z + 15, 0.9, MT, 30]);
  for (const end of [-1, 1]) {
    const edge = end < 0 ? runway.zMin : runway.zMax, inward = -end;
    // Threshold "piano keys": six stripes each side of the centreline.
    for (let k = 0; k < 6; k++) for (const side of [-1, 1])
      white.push([rx + side * (2.6 + k * 1.95), MY, edge + inward * 21, 1.5, MT, 30]);
    // Aiming point blocks.
    for (const side of [-1, 1]) white.push([rx + side * 6, MY, edge + inward * 140, 4, MT, 45]);
    // Touchdown zone bars.
    for (const dz of [200, 260]) for (const side of [-1, 1]) for (const k of [0, 1])
      white.push([rx + side * (5 + k * 2.6), MY, edge + inward * dz, 1.6, MT, 22]);
    // Runway designator in seven-segment digits: south end reads "36" (heading north), north end "18".
    const digits = end < 0 ? '36' : '18';
    const yaw = end < 0 ? 0 : Math.PI, at = edge + inward * 66;
    [...digits].forEach((d, i) => sevenSegment(white, Number(d), rx + (i === 0 ? -1 : 1) * 5.5 * (end < 0 ? 1 : -1), at, yaw));
  }
  // Yellow taxi centrelines, link lead-ons, apron stand lead-ins and hold bars.
  lines.push([taxiway.x, MY, 0, 0.35, MT, taxiway.zMax - taxiway.zMin]);
  for (const lz of links) {
    lines.push([(taxiway.x + rx) / 2, MY, lz, rx - taxiway.x, MT, 0.35]);
    for (const dx of [0, 1.2]) lines.push([rx - runway.halfWidth - 14 - dx, MY, lz, 0.3, MT, linkHalfWidth * 2 - 1]);
  }
  for (const stand of AIRFIELD_STANDS) {
    lines.push([(stand.x + taxiway.x) / 2, MY, stand.z, taxiway.x - stand.x, MT, 0.3]);
    if (!stand.covered) lines.push([stand.x, MY, stand.z, 0.3, MT, 14]);
  }
  batch('af-marking-white', paint, white);
  batch('af-marking-yellow', yellow, lines);

  // ---------- Lights ----------
  const fixture = (list: Placement[], x: number, z: number, size = 0.35) => list.push([x, 0.35, z, size, size, size]);
  const edgeW: Placement[] = [], green: Placement[] = [], red: Placement[] = [], blue: Placement[] = [], approach: Placement[] = [];
  const bases: Placement[] = [];
  for (let z = runway.zMin; z <= runway.zMax + 0.1; z += 32) for (const side of [-1, 1]) {
    fixture(edgeW, rx + side * (runway.halfWidth + 1.5), z);
  }
  for (const end of [-1, 1]) {
    const edge = end < 0 ? runway.zMin : runway.zMax;
    for (let x = -runway.halfWidth; x <= runway.halfWidth + 0.1; x += 2.5) {
      fixture(green, rx + x, edge + end * 1.5);
      fixture(red, rx + x, edge - end * 1.5);
    }
    // Approach light system: centreline bars every 6 m plus a crossbar at 30 m.
    for (let d = 6; d <= approachLength; d += 6) {
      for (const dx of [-1.2, 0, 1.2]) approach.push([rx + dx, 0.9, edge + end * d, 0.4, 0.4, 0.4]);
      bases.push([rx, 0.4, edge + end * d, 4, 0.2, 0.3]);
      for (const dx of [-1.2, 0, 1.2]) bases.push([rx + dx, 0.35, edge + end * d, 0.12, 0.7, 0.12]);
    }
    for (let dx = -9; dx <= 9; dx += 1.5) if (Math.abs(dx) > 2) approach.push([rx + dx, 0.9, edge + end * 30, 0.4, 0.4, 0.4]);
    bases.push([rx, 0.5, edge + end * 30, 19, 0.2, 0.3]);
  }
  for (let z = taxiway.zMin; z <= taxiway.zMax + 0.1; z += 24) for (const side of [-1, 1]) {
    const x = taxiway.x + side * (taxiway.halfWidth + 1);
    if (links.some(lz => Math.abs(z - lz) < linkHalfWidth + 1) && side > 0) continue;
    if (side < 0 && z > apron.zMin - 2 && z < apron.zMax + 2) continue;
    fixture(blue, x, z, 0.3);
  }
  for (const lz of links) for (let x = taxiway.x + taxiway.halfWidth + 6; x < rx - runway.halfWidth - 4; x += 8)
    for (const side of [-1, 1]) fixture(blue, x, lz + side * (linkHalfWidth + 1), 0.3);
  batch('af-light-white', lamp.white, edgeW, 'box', true);
  batch('af-light-green', lamp.green, green, 'box', true);
  batch('af-light-red', lamp.red, red, 'box', true);
  batch('af-light-blue', lamp.blue, blue, 'box', true);
  batch('af-light-approach', lamp.white, approach, 'box', true);
  batch('af-light-frames', steel, bases);

  // Sequenced "rabbit" strobe racing toward each threshold.
  const strobes = [-1, 1].map(end => {
    const strobe = MeshBuilder.CreateSphere(`af-strobe-${end}`, { diameter: 1.1, segments: 4 }, scene);
    strobe.material = lamp.white; strobe.isPickable = false; meshes.push(strobe); lightMeshes.push(strobe);
    return { strobe, end, edge: end < 0 ? runway.zMin : runway.zMax };
  });

  // ---------- Hangars ----------
  for (const h of AIRFIELD_HANGARS) {
    const back = h.x - h.length, cx = h.x - h.length / 2, half = h.width / 2;
    if (h.kind === 'shelter') {
      // Hardened arch built from flat concrete facets (low-poly, box colliders).
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
        const z0 = Math.cos(a0) * half, y0 = Math.sin(a0) * h.height, z1 = Math.cos(a1) * half, y1 = Math.sin(a1) * h.height;
        const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
        box(`${h.id}-arch-${i}`, [h.length, 0.8, len + 0.35], [cx, (y0 + y1) / 2, h.z + (z0 + z1) / 2], shelterMat, [Math.atan2(-dy, dz), 0, 0]);
      }
      const wall = MeshBuilder.CreateDisc(`${h.id}-back`, { radius: 1, arc: 0.5, tessellation: 18, sideOrientation: Mesh.DOUBLESIDE }, scene);
      wall.scaling.set(half, h.height, 1); wall.rotation.y = Math.PI / 2; wall.position.set(back + 0.3, 0, h.z);
      wall.material = shelterMat; wall.receiveShadows = true; meshes.push(wall); casters.push(wall);
      box(`${h.id}-back-collider`, [1, h.height * 0.9, h.width * 0.9], [back, h.height * 0.45, h.z], shelterMat).isVisible = false;
      // Blast doors parked open on each side.
      for (const side of [-1, 1]) {
        // Hinged blast doors swung fully open, perpendicular to the front.
        box(`${h.id}-door-${side}`, [half * 0.9, h.height * 0.8, 1.2], [h.x + half * 0.45, h.height * 0.4, h.z + side * (half + 0.6)], doorMat);
        box(`${h.id}-buttress-${side}`, [2.2, h.height * 0.6, 1.6], [h.x - 0.6, h.height * 0.3, h.z + side * (half + 0.2)], concrete);
      }
    } else {
      // Maintenance hall: open front, doors slid into side pockets.
      const doorH = h.height - 3.5;
      box(`${h.id}-back`, [0.6, h.height, h.width], [back, h.height / 2, h.z], hallMat);
      for (const side of [-1, 1]) {
        box(`${h.id}-side-${side}`, [h.length, h.height, 0.6], [cx, h.height / 2, h.z + side * half], hallMat);
        box(`${h.id}-roof-${side}`, [h.length + 1, 0.5, half + 0.8], [cx, h.height + 0.9, h.z + side * half / 2], roofMat, [side * 0.12, 0, 0], false);
        box(`${h.id}-pocket-${side}`, [2.4, doorH + 0.6, 12], [h.x - 1.2, (doorH + 0.6) / 2, h.z + side * (half + 6)], doorMat);
      }
      box(`${h.id}-roof-collider`, [h.length, 0.4, h.width], [cx, h.height + 0.2, h.z], roofMat).isVisible = false;
      box(`${h.id}-header`, [0.8, h.height - doorH, h.width], [h.x - 0.4, doorH + (h.height - doorH) / 2, h.z], hallMat);
      for (let k = -2; k <= 2; k++) box(`${h.id}-window-${k}`, [0.1, 1.2, 6], [h.x + 0.05, doorH + 1.6, h.z + k * 9], glass, [0, 0, 0], false);
    }
    // Amber door lights and a painted bay number.
    for (const side of [-1, 1]) {
      const lampMesh = MeshBuilder.CreateSphere(`${h.id}-doorlamp-${side}`, { diameter: 0.6, segments: 4 }, scene);
      lampMesh.position.set(h.x + 0.7, (h.kind === 'shelter' ? h.height * 0.55 : h.height - 3), h.z + side * (half - 2));
      lampMesh.material = lamp.amber; lampMesh.isPickable = false; meshes.push(lampMesh); lightMeshes.push(lampMesh);
    }
  }

  // ---------- Blast walls at the apron's north and south ends ----------
  for (const zEdge of [apron.zMin - 4, apron.zMax + 4]) for (let x = apron.xMin + 3; x < apron.xMax - 2; x += 2.7)
    box(`af-twall-${zEdge}-${x.toFixed(0)}`, [2.6, 3.6, 0.6], [x, 1.8, zEdge], concrete);

  // ---------- Control tower and operations block ----------
  {
    const { x, z } = AIRFIELD_TOWER;
    box('af-tower-shaft', [6, 14, 6], [x, 7, z], concrete);
    box('af-tower-cab', [10, 3.6, 10], [x, 15.8, z], glass);
    box('af-tower-cabfloor', [10.6, 0.6, 10.6], [x, 14.1, z], steel, [0, 0, 0], false);
    box('af-tower-roof', [11.4, 0.5, 11.4], [x, 17.85, z], steel, [0, 0, 0], false);
    box('af-tower-mast', [0.2, 4, 0.2], [x + 3, 20, z + 3], steel, [0, 0, 0], false);
    box('af-ops', [22, 5, 11], [x - 18, 2.5, z + 2], hallMat);
    box('af-ops-roof', [22.6, 0.4, 11.6], [x - 18, 5.2, z + 2], roofMat, [0, 0, 0], false);
    for (let k = -3; k <= 3; k++) box(`af-ops-window-${k}`, [2, 1.1, 0.1], [x - 18 + k * 3, 3, z + 7.56], glass, [0, 0, 0], false);
    const obstruction = MeshBuilder.CreateSphere('af-tower-obstruction', { diameter: 0.5, segments: 4 }, scene);
    obstruction.position.set(x + 3, 22.2, z + 3); obstruction.material = lamp.red; obstruction.isPickable = false;
    meshes.push(obstruction); lightMeshes.push(obstruction);
  }
  // Rotating aerodrome beacon on top of the tower.
  const beacon = new Mesh('af-beacon', scene);
  beacon.position.set(AIRFIELD_TOWER.x - 2, 18.6, AIRFIELD_TOWER.z - 2); meshes.push(beacon);
  for (const [i, mat] of [lamp.green, lamp.white].entries()) {
    const head = MeshBuilder.CreateBox(`af-beacon-${i}`, { width: 0.5, height: 0.5, depth: 0.25 }, scene);
    head.parent = beacon; head.position.z = i ? 0.3 : -0.3; head.material = mat; head.isPickable = false;
    meshes.push(head); lightMeshes.push(head);
  }

  // ---------- Fuel farm ----------
  {
    const { x, z } = AIRFIELD_FUEL;
    [-11, 0, 11].forEach((dz, i) => {
      const t = MeshBuilder.CreateCylinder(`af-fuel-${i}`, { height: 6, diameter: 8, tessellation: 12 }, scene);
      t.position.set(x, 3, z + dz); t.material = tankMat; t.receiveShadows = true;
      meshes.push(t); casters.push(t); solid(t, PhysicsShapeType.CYLINDER);
    });
    for (const side of [-1, 1]) {
      box(`af-fuel-bund-x-${side}`, [0.7, 1, 36], [x + side * 6, 0.5, z], concrete);
      box(`af-fuel-bund-z-${side}`, [12.7, 1, 0.7], [x, 0.5, z + side * 18], concrete);
    }
    box('af-fuel-pipe', [0.4, 0.4, 30], [x + 4.6, 1.6, z], steel, [0, 0, 0], false);
  }

  // ---------- Floodlight masts along the hangar line, aimed at the apron ----------
  const floods: Placement[] = [];
  for (const z of [-152, -97.5, -47.5, 47.5, 97.5, 152]) {
    const x = 220;
    box(`af-mast-${z}`, [0.5, 20, 0.5], [x, 10, z], steel, [0, 0, 0], false);
    box(`af-mast-head-${z}`, [0.6, 1.6, 4.2], [x + 0.4, 20.2, z], steel, [0, 0, 0.35], false);
    for (const dz of [-1.4, 0, 1.4]) floods.push([x + 0.75, 19.95, z + dz, 0.15, 1.2, 1.1]);
  }
  batch('af-light-flood', lamp.flood, floods, 'box', true);

  // ---------- Windsock beside the runway ----------
  const sock = new Mesh('af-windsock', scene);
  sock.position.set(runway.x + runway.halfWidth + 22, 6, runway.zMin + 70); meshes.push(sock);
  box('af-windsock-pole', [0.2, 6, 0.2], [sock.position.x, 3, sock.position.z], steel, [0, 0, 0], false);
  for (let i = 0; i < 5; i++) {
    const seg = MeshBuilder.CreateCylinder(`af-windsock-${i}`, { height: 0.9, diameterTop: 1 - i * 0.12, diameterBottom: 0.88 - i * 0.12, tessellation: 8 }, scene);
    seg.parent = sock; seg.rotation.z = -Math.PI / 2; seg.position.x = 0.45 + i * 0.9;
    seg.material = i % 2 ? lamp.white : sockOrange; seg.isPickable = false; meshes.push(seg);
  }

  // ---------- Glow and animation ----------
  const glow = new GlowLayer('film-airfield-glow', scene, { mainTextureSamples: 1, blurKernelSize: 24 });
  glow.intensity = 0.7;
  for (const mesh of lightMeshes) glow.addIncludedOnlyMesh(mesh);

  let time = 0;
  const observer: Observer<Scene> | null = scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() / 1000;
    beacon.rotation.y = time * 2.4;
    sock.rotation.y = Math.sin(time * 0.35) * 0.35 + 0.6;
    sock.rotation.z = -0.08 + Math.sin(time * 1.7) * 0.03;
    const step = Math.floor(time / 0.07) % 12;
    for (const { strobe, end, edge } of strobes) {
      const d = approachLength - step * 6;
      strobe.isVisible = d >= 6;
      strobe.position.set(runway.x, 1.3, edge + end * d);
    }
  });

  optimizeStaticProps(meshes, casters, [...lightMeshes, beacon, sock, ...beacon.getChildMeshes(), ...sock.getChildMeshes()]);
  return {
    meshes, casters,
    dispose() {
      if (observer) scene.onBeforeRenderObservable.remove(observer);
      glow.dispose();
      bodies.forEach(b => b.dispose());
      meshes.filter(m => !m.isDisposed()).forEach(m => m.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}

/** Appends a seven-segment digit (18 m tall, 9 m wide) centred at (x, z); yaw 0 reads upright facing +Z. */
function sevenSegment(out: Placement[], digit: number, x: number, z: number, yaw: number) {
  const map = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abfgcd'][digit];
  const w = 4.5, hh = 9, t = 1.4;
  const segments: Record<string, [number, number, number, number]> = {
    a: [0, hh, 2 * w, t], g: [0, 0, 2 * w, t], d: [0, -hh, 2 * w, t],
    f: [-w, hh / 2, t, hh], b: [w, hh / 2, t, hh], e: [-w, -hh / 2, t, hh], c: [w, -hh / 2, t, hh],
  };
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  for (const key of map) {
    const [lx, lz, sx, sz] = segments[key];
    // Babylon is left-handed: facing +Z, +X is to the viewer's right.
    out.push([x + lx * cos + lz * sin, 0.03, z - lx * sin + lz * cos, sx, 0.04, sz, yaw]);
  }
}
