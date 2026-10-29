import { Color3, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { KUL_RAIL_CRANE, KUL_RAIL_DEPOT, KUL_RAIL_TRACKS, KUL_RAIL_WAGONS, KUL_RAIL_YARD } from './kulRailYardLayout.ts';
import { kulTerrainHeight } from './kulVadisiLayout.ts';

/** Original procedural scenery. Metres; static cover, decorative flush rails, no train simulation. */
export function createKulRailYard(scene: Scene) {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [];
  const groups = new Map<StandardMaterial, Mesh[]>();
  const dispose = () => {
    bodies.forEach(b => b.dispose()); meshes.forEach(m => m.dispose()); materials.forEach(m => m.dispose());
    groups.forEach(parts => parts.forEach(m => m.dispose())); groups.clear();
    bodies.length = meshes.length = materials.length = 0;
  };
  const material = (id: string, color: string) => {
    const m = new StandardMaterial(`rail-${id}`, scene); m.diffuseColor = Color3.FromHexString(color);
    m.specularColor = Color3.Black(); materials.push(m); groups.set(m, []); return m;
  };
  const box = (id: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: StandardMaterial, yaw = 0) => {
    const m = MeshBuilder.CreateBox(`rail-${id}`, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z); m.rotation.y = yaw; m.material = mat; groups.get(mat)!.push(m); return m;
  };
  const cover = (id: string, x: number, y: number, z: number, w: number, h: number, d: number, surface: string, yaw = 0) => {
    const m = MeshBuilder.CreateBox(`rail-${id}-collider`, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z); m.rotation.y = yaw; m.isVisible = false; m.isPickable = false;
    m.metadata = { railYard: true, hardCover: true, surface }; meshes.push(m);
    bodies.push(new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  };
  try {
    const steel = material('steel', '#34383B'), rust = material('rust', '#9D6F50');
    const faded = material('faded-green', '#626B59'), wood = material('sleepers', '#645444');
    const concrete = material('concrete', '#828575'), roof = material('roof', '#505653');
    const dark = material('recess', '#292E2C'), warning = material('warning', '#BDAB8B');
    const floor = KUL_RAIL_YARD.height;
    // Rails and sleepers follow the actual terrain, including the factory spur and approach slopes.
    const track = (id: string, a: Vector3, b: Vector3) => {
      const delta = b.subtract(a), length = Math.hypot(delta.x, delta.z), n = Math.ceil(length / 2);
      const yaw = Math.atan2(delta.x, delta.z), nx = Math.cos(yaw), nz = -Math.sin(yaw);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = a.x + delta.x * t, z = a.z + delta.z * t;
        // Sleepers sit almost flush so tracks remain traversable by the tank suspension.
        box(`${id}-sleeper-${i}`, x, kulTerrainHeight(x, z) + 0.015, z, 3.1, 0.07, 0.26, wood, yaw);
        for (const side of [-1, 1]) {
          const px = x + nx * side * 0.76, pz = z + nz * side * 0.76;
          const ax = px - delta.x / n / 2, az = pz - delta.z / n / 2;
          const bx = px + delta.x / n / 2, bz = pz + delta.z / n / 2;
          const from = new Vector3(ax, kulTerrainHeight(ax, az) + 0.08, az);
          const to = new Vector3(bx, kulTerrainHeight(bx, bz) + 0.08, bz);
          const rail = box(`${id}-rail-${i}-${side}`, 0, 0, 0, 0.1, 0.12, Vector3.Distance(from, to) + 0.02, steel);
          rail.position.copyFrom(from.add(to).scale(0.5));
          rail.rotationQuaternion = Quaternion.FromLookDirectionLH(to.subtract(from).normalize(), Vector3.Up());
        }
      }
    };
    for (const x of KUL_RAIL_TRACKS) track(`siding-${x}`, new Vector3(x, 0, -76), new Vector3(x, 0, 76));
    const spur = [new Vector3(150, 0, -48), new Vector3(218, 0, -58), new Vector3(242, 0, -74), new Vector3(260, 0, -76)];
    for (let i = 1; i < spur.length; i++) track(`spur-${i}`, spur[i - 1], spur[i]);
    KUL_RAIL_WAGONS.forEach((p, i) => {
      const paint = i % 2 ? faded : rust, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
      const part = (id: string, dx: number, y: number, dz: number, w: number, h: number, d: number, mat: StandardMaterial) =>
        box(`wagon-${i}-${id}`, p.x + dx * c + dz * s, floor + y, p.z - dx * s + dz * c, w, h, d, mat, p.yaw);
      part('chassis', 0, 0.95, 0, 3.3, 0.4, 16.5, steel);
      for (const z of [-5.2, 5.2]) for (const dz of [-0.8, 0.8]) for (const x of [-1.25, 1.25]) {
        const wheel = MeshBuilder.CreateCylinder(`rail-wheel-${i}`, { height: 0.22, diameter: 0.85, tessellation: 10 }, scene);
        wheel.rotationQuaternion = Quaternion.FromEulerAngles(0, p.yaw, Math.PI / 2);
        wheel.position.set(p.x + x * c + (z + dz) * s, floor + 0.48, p.z - x * s + (z + dz) * c);
        wheel.material = steel; groups.get(steel)!.push(wheel);
      }
      part('floor', 0, 1.2, 0, 3.35, 0.18, 16, wood);
      const height = p.open ? 1.8 : 3.2;
      for (const x of [-1.62, 1.62]) {
        part('side', x, 1.3 + height / 2, 0, 0.16, height, 16, paint);
        for (let z = -7.5; z <= 7.5; z += 2.5) part('rib', x * 1.04, 1.3 + height / 2, z, 0.12, height + 0.14, 0.13, steel);
        if (!p.open) {
          part('door', x * 1.035, 2.65, 0, 0.09, 2.65, 3.4, faded);
          part('door-runner', x * 1.06, 4.15, 0, 0.12, 0.12, 4, steel);
        }
      }
      for (const z of [-7.95, 7.95]) part('end', 0, 1.3 + height / 2, z, 3.3, height, 0.15, paint);
      if (!p.open) part('roof', 0, 4.6, 0, 3.55, 0.22, 16.4, roof);
      for (const z of [-8.7, 8.7]) part('coupler', 0, 0.9, z, 0.3, 0.22, 0.9, steel);
      // Solid wagon bodies are cover; the open cars retain their visible hollow interior.
      if (!p.open) cover(`wagon-${i}`, p.x, floor + 2.3, p.z, 3.5, 4.6, 16.4, 'metal', p.yaw);
      else {
        cover(`wagon-${i}-floor`, p.x, floor + 0.7, p.z, 3.5, 1.4, 16.4, 'metal', p.yaw);
        for (const x of [-1.62, 1.62]) cover(`wagon-${i}-side`, p.x + x * c, floor + 2.2, p.z - x * s, 0.2, 1.8, 16, 'metal', p.yaw);
        for (const z of [-7.95, 7.95]) cover(`wagon-${i}-end`, p.x + z * s, floor + 2.2, p.z + z * c, 3.3, 1.8, 0.2, 'metal', p.yaw);
      }
    });
    const p = KUL_RAIL_DEPOT;
    box('depot-plinth', p.x, floor + 0.2, p.z, 14.8, 0.5, 22.8, concrete);
    box('depot', p.x, floor + 2.7, p.z, p.width, 5.2, p.depth, concrete);
    for (const side of [-1, 1]) {
      const panel = box('depot-roof', p.x + side * 3.6, floor + 5.8, p.z, 7.5, 0.24, 23, roof);
      panel.rotation.z = -side * 0.18;
    }
    // West-facing closed sliding door, upper windows, and an overhanging service canopy.
    box('depot-door', p.x - 7.05, floor + 2.05, p.z, 0.12, 4, 6, dark);
    for (let z = -2.8; z <= 2.8; z += 0.7) box('depot-door-rib', p.x - 7.13, floor + 2.05, p.z + z, 0.08, 3.9, 0.06, steel);
    for (const z of [-7.5, 7.5]) box('depot-window', p.x - 7.08, floor + 4.1, p.z + z, 0.1, 0.8, 2, dark);
    box('depot-canopy', p.x - 8.3, floor + 4.65, p.z, 2.8, 0.18, 8, roof);
    box('depot-door-header', p.x - 7.17, floor + 4.25, p.z, 0.12, 0.25, 6.4, warning);
    cover('depot', p.x, floor + 2.8, p.z, 14.8, 5.8, 22.8, 'concrete');

    // Fallen loading crane: surviving pivot, tilted cabin, a long triangular lattice boom and loose hook.
    const crane = KUL_RAIL_CRANE;
    box('crane-foot', crane.x, floor + 0.45, crane.z, 7, 0.9, 7, concrete);
    box('crane-pivot', crane.x, floor + 1.5, crane.z, 2.8, 2, 3, steel);
    const cabin = box('crane-cabin', crane.x, floor + 2.2, crane.z + 1.5, 3.8, 3, 4, warning); cabin.rotation.z = 0.32;
    box('crane-window', crane.x - 1.95, floor + 2.8, crane.z + 1.5, 0.12, 1.2, 2.4, dark).rotation.z = 0.32;
    const beam = (id: string, from: Vector3, to: Vector3, thickness: number) => {
      const m = box(id, 0, 0, 0, thickness, thickness, Vector3.Distance(from, to), rust);
      m.position.copyFrom(from.add(to).scale(0.5)); m.rotationQuaternion = Quaternion.FromLookDirectionLH(to.subtract(from).normalize(), Vector3.Up());
    };
    const boomPoint = (t: number, side: number, top = false) => new Vector3(crane.x - t * 23 + (top ? 0 : side * 1.3), floor + 3.8 - t * 2.6 + (top ? 1.7 : 0), crane.z + t * 12);
    for (const side of [-1, 1]) {
      beam('crane-chord', boomPoint(0, side), boomPoint(1, side), 0.22);
      for (let i = 0; i < 8; i++) {
        beam('crane-brace', boomPoint(i / 8, side), boomPoint((i + 1) / 8, 0, true), 0.12);
        beam('crane-rung', boomPoint(i / 8, side), boomPoint(i / 8, 0, true), 0.12);
      }
    }
    beam('crane-top', boomPoint(0, 0, true), boomPoint(1, 0, true), 0.22);
    box('crane-hook', crane.x - 24, floor + 0.3, crane.z + 13, 0.6, 0.6, 1.1, steel);
    cover('crane-base', crane.x, floor + 1.8, crane.z + 1, 7, 3.6, 7, 'metal');
    // Segment colliders follow the fallen boom; no invisible wall across the gaps between cars.
    const yaw = Math.atan2(-23, 12);
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4, center = boomPoint(t, 0);
      cover(`crane-boom-${i}`, center.x, center.y + 0.75, center.z, 2.9, 2.1, 6.7, 'metal', yaw);
    }
    // One draw mesh per material; detail pieces never become separate physics bodies.
    for (const [mat, parts] of groups) {
      const mesh = Mesh.MergeMeshes(parts, true, true);
      if (!mesh) throw new Error(`Rail yard merge failed: ${mat.name}`);
      parts.length = 0; mesh.name = mesh.id = `${mat.name}-detail`; mesh.material = mat;
      mesh.metadata = { railYard: true, hardCover: false, surface: 'metal' };
      mesh.isPickable = false; mesh.receiveShadows = true; mesh.freezeWorldMatrix(); meshes.push(mesh);
    }
    return { meshes, shadowCasters: meshes.filter(m => m.isVisible), dispose };
  } catch (error) { dispose(); throw error; }
}
