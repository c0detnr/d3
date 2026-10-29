import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, NullEngine, Scene, Vector3, type StandardMaterial } from '@babylonjs/core';
import { createKulRailYard } from '../src/game/world/createKulRailYard.ts';
import { KUL_RAIL_CRANE, KUL_RAIL_DEPOT, KUL_RAIL_WAGONS, KUL_RAIL_YARD } from '../src/game/world/kulRailYardLayout.ts';
import { KUL_PATHS, kulRoadDistance, kulTerrainHeight } from '../src/game/world/kulVadisiLayout.ts';

const engine = new NullEngine(), scene = new Scene(engine);
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, await HavokPhysics({ wasmBinary })));
const physics = scene.getPhysicsEngine()!;
const baseline = () => ({ meshes: scene.meshes.length, materials: scene.materials.length, nodes: scene.transformNodes.length, bodies: physics.getBodies().length });
const before = baseline(), floor = KUL_RAIL_YARD.height;
try {
  for (let cycle = 0; cycle < 2; cycle++) {
    const yard = createKulRailYard(scene);
    yard.meshes.forEach(m => m.computeWorldMatrix(true));
    assert.equal(yard.shadowCasters.length, 8, 'Geometry batched by the eight materials');
    for (const wagon of KUL_RAIL_WAGONS) {
      assert.equal(kulTerrainHeight(wagon.x, wagon.z), floor, 'Wagons on the level yard');
      assert.ok(kulRoadDistance(wagon.x, wagon.z) > 35, 'Wagons clear of the east route');
      const hit = physics.raycast(new Vector3(wagon.x - 6, floor + 2, wagon.z), new Vector3(wagon.x + 6, floor + 2, wagon.z));
      assert.ok(hit.hasHit && hit.body?.transformNode.metadata?.surface === 'metal', 'Wagon side stops shells');
      const down = physics.raycast(new Vector3(wagon.x, floor + 8, wagon.z), new Vector3(wagon.x, floor - 1, wagon.z));
      assert.ok(down.hasHit);
      assert.ok(Math.abs(down.hitPointWorld.y - floor - (wagon.open ? 1.4 : 4.6)) < 0.03, 'Open wagons have no invisible roof');
    }
    for (const x of [247, 272, 296, 318]) for (const dx of [-2.5, 0, 2.5]) {
      // A five-metre-wide tank corridor along the sidings, excluding the crane at the far north end.
      assert.ok(!physics.raycast(new Vector3(x + dx, floor + 0.65, -72), new Vector3(x + dx, floor + 0.65, 42)).hasHit, 'Longitudinal tank corridors stay open');
    }
    for (const z of [-5, 0, 5]) assert.ok(!physics.raycast(new Vector3(239, floor + 1, z), new Vector3(343, floor + 1, z)).hasHit, 'Ten-metre cross-yard corridor stays open');
    for (const p of [KUL_RAIL_DEPOT, KUL_RAIL_CRANE]) {
      assert.ok(physics.raycast(new Vector3(p.x, floor + 12, p.z), new Vector3(p.x, floor - 1, p.z)).hasHit, 'Depot and crane are hard cover');
    }
    // Sample both tank tracks on every existing road; no scenery occupies the main lanes.
    for (const path of KUL_PATHS) for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1], b = path.points[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 3);
      for (let j = 0; j <= n; j++) {
        const x = a.x + (b.x - a.x) * j / n, z = a.z + (b.z - a.z) * j / n, y = kulTerrainHeight(x, z);
        assert.ok(!physics.raycast(new Vector3(x, y + 6, z), new Vector3(x, y - 0.5, z)).hasHit, `${path.id}: road clear`);
      }
    }
    if (process.argv.includes('--export')) {
      const geometry = yard.shadowCasters.map(m => {
        const positions = m.getVerticesData('position')!, world = m.computeWorldMatrix(true), vertices: number[][] = [];
        for (let i = 0; i < positions.length; i += 3) vertices.push(Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), world).asArray());
        return { name: m.name, vertices, indices: Array.from(m.getIndices()!), color: (m.material as StandardMaterial).diffuseColor.asArray() };
      });
      // Same terrain function used by the live game, for an offline visual check.
      const vertices: number[][] = [], indices: number[] = [];
      for (let z = -110; z <= 110; z += 2) for (let x = 130; x <= 360; x += 2) vertices.push([x, kulTerrainHeight(x, z), z]);
      const width = 116;
      for (let j = 0; j < 110; j++) for (let i = 0; i < 115; i++) { const k = j * width + i; indices.push(k, k + width, k + 1, k + 1, k + width, k + width + 1); }
      geometry.push({ name: 'terrain', vertices, indices, color: [0.48, 0.44, 0.34] });
      await writeFile('/tmp/d3-rail-yard-geometry.json', JSON.stringify(geometry));
    }
    console.log({ cycle, renderMeshes: yard.shadowCasters.length, colliders: physics.getBodies().length, triangles: yard.shadowCasters.reduce((n, m) => n + m.getTotalIndices() / 3, 0) });
    yard.dispose(); yard.dispose(); assert.deepEqual(baseline(), before, 'All resources released, including repeated disposal');
  }
  console.log('PASS: rail yard cover, open-car interior, tank corridors, road clearance, two lifecycle cycles.');
} finally { scene.dispose(); engine.dispose(); }
