import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { ArcRotateCamera, HavokPlugin, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { createKulVadisi } from '../src/game/world/createKulVadisi.ts';
import { KUL_ROUTES, KUL_CONNECTIONS, KUL_STRUCTURES, KUL_SPAWNS, KUL_STEP, kulTerrainHeight, type MapPoint } from '../src/game/world/kulVadisiLayout.ts';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { extractTankRig } from '../src/game/vehicle/tankRig.ts';
import { TankVehicle } from '../src/game/vehicle/TankVehicle.ts';

const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary });
const engine = new NullEngine(); const scene = new Scene(engine);
new ArcRotateCamera('check', 0, 1, 20, Vector3.Zero(), scene);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
scene.physicsEnabled = false; const physics = scene.getPhysicsEngine()!; physics.setTimeStep(1 / 60);
// glTF creates a shared scene BRDF texture on first load; it is owned by Scene.
const warmup = await loadTankModel(scene, new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url))), Vector3.Zero()); warmup.dispose();
const baseline = { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length };
const factorySources = {
  hangar: new Uint8Array(await readFile(new URL('../assets/environment/maintenance_hangar_01/maintenance_hangar_01.glb', import.meta.url))),
  workshop: new Uint8Array(await readFile(new URL('../assets/environment/maintenance_workshop_01/maintenance_workshop_01.glb', import.meta.url))),
};
const results: Record<string, unknown> = {};
try {
  for (let cycle = 0; cycle < 2; cycle++) {
    const map = await createKulVadisi(scene, 'A', factorySources); scene.render();
    assert.equal(KUL_STRUCTURES.filter(s => s.kind === 'outer').length, 6);
    assert.equal(KUL_STRUCTURES.filter(s => s.kind === 'inner').length, 2);
    assert.equal(KUL_STRUCTURES.filter(s => s.kind === 'command').length, 2);
    const pos = map.terrain.getVerticesData('position')!, ids = map.terrain.getIndices()!;
    for (let i = 456; i < ids.length; i += 1818) {
      const a = ids[i] * 3, b = ids[i + 1] * 3, c = ids[i + 2] * 3;
      const x = (pos[a] + pos[b] + pos[c]) / 3, y = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
      const hit = physics.raycast(new Vector3(x, y + 0.02, z), new Vector3(x, y - 0.1, z));
      assert.ok(hit.hasHit && Math.abs(hit.hitPointWorld.y - y) < 0.025, `Görsel/fizik yüzey: ${x},${z}`);
    }
    for (const p of Object.values(KUL_SPAWNS)) for (const dx of [-5, 0, 5]) for (const dz of [-6, 0, 6]) {
      const hit = physics.raycast(new Vector3(p.x + dx, 3, p.z + dz), new Vector3(p.x + dx, -1, p.z + dz));
      assert.ok(hit.hasHit && Math.abs(hit.hitPointWorld.y) < 0.025, 'Başlangıçta düz manevra alanı');
    }
    // Tank-width corridor clearance checks include every connector and both exits.
    for (const path of [...KUL_ROUTES, ...KUL_CONNECTIONS]) for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1], b = path.points[i]; const length = Math.hypot(b.x - a.x, b.z - a.z);
      for (let t = 0; t <= length; t += KUL_STEP) {
        const x = a.x + (b.x - a.x) * t / length, z = a.z + (b.z - a.z) * t / length;
        for (const s of KUL_STRUCTURES) assert.ok(Math.abs(x - s.x) > s.width / 2 + 3 || Math.abs(z - s.z) > s.depth / 2 + 3, `${path.id}: yapı geçişi kapatıyor ${s.id}`);
        const slope = Math.hypot(kulTerrainHeight(x + 1, z) - kulTerrainHeight(x - 1, z), kulTerrainHeight(x, z + 1) - kulTerrainHeight(x, z - 1)) / 2;
        assert.ok(slope < 0.35, `${path.id}: sürülebilir eğim ${slope}`);
      }
    }
    for (const [team, spawn] of Object.entries(KUL_SPAWNS)) {
      for (const x of [-210, 0, 210]) {
        const from = new Vector3(x, kulTerrainHeight(x, 0) + 2.5, 0);
        const to = new Vector3(spawn.x, 2.5, spawn.z);
        const hit = physics.raycast(from, to);
        assert.ok(hit.hasHit && Vector3.Distance(hit.hitPointWorld, to) > 8, `${team}: doğma çıkışına düz atış`);
      }
    }
    for (const id of ['A-outer-west', 'B-command']) {
      const mesh = scene.getMeshByName(id)!;
      const from = mesh.position.add(new Vector3(0, 0, -60));
      const hit = physics.raycast(from, mesh.position);
      assert.ok(hit.hasHit && hit.body?.transformNode.name === id, `${id}: mermiyi durduran siper`);
      assert.equal(hit.body?.transformNode.metadata.surface, id === 'factory-hangar' ? 'metal' : 'concrete');
    }
    for (const id of ['factory-hangar', 'factory-workshop']) {
      assert.equal(scene.getMeshByName(`${id}-mark`), null, 'No placeholder roof marker');
      const structure = KUL_STRUCTURES.find(s => s.id === id)!;
      const meshes = scene.meshes.filter(m => m.metadata?.structure === id);
      const visible = meshes.filter(m => m.isVisible);
      const colliders = meshes.filter(m => m.metadata?.gltf?.extras?.collision_only);
      assert.equal(colliders.length, id === 'factory-hangar' ? 3 : 6);
      assert.ok(colliders.every(m => !m.isVisible && !m.isPickable), 'Collision geometry is hidden');
      const minY = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.y));
      assert.ok(Math.abs(minY - kulTerrainHeight(structure.x, structure.z)) < 0.001, 'Building grounded');
      const minX = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.x));
      const maxX = Math.max(...visible.map(m => m.getBoundingInfo().boundingBox.maximumWorld.x));
      assert.ok(maxX - minX <= structure.width + 0.01, 'Metre scale footprint');
      for (const dx of [-structure.width / 2, 0, structure.width / 2]) for (const dz of [-structure.depth / 2, 0, structure.depth / 2]) {
        assert.ok(Math.abs(kulTerrainHeight(structure.x + dx, structure.z + dz) - minY) < 0.001, 'Level pad');
      }
      const from = new Vector3(structure.x, minY + 2, structure.z - structure.depth);
      const hit = physics.raycast(from, new Vector3(structure.x, minY + 2, structure.z));
      assert.ok(hit.hasHit && hit.body?.transformNode.metadata?.structure === id, `${id}: actual GLB blocks projectiles`);
      assert.equal(hit.body?.transformNode.metadata.surface, 'metal');
      for (const side of [-1, 1]) {
        const x = structure.x + side * (structure.width / 2 + 3);
        const hit = physics.raycast(new Vector3(x, minY + 2, structure.z - structure.depth), new Vector3(x, minY + 2, structure.z + structure.depth));
        assert.ok(!hit.hasHit, `${id}: no invisible box outside building`);
      }
    }
    if (!cycle) {
      for (const tankId of ['01', '02']) {
        const tank = await loadTankModel(scene, new Uint8Array(await readFile(new URL(`../assets/tanks/iron_dust_${tankId}/iron_dust_${tankId}.glb`, import.meta.url))), map.spawn);
        const rig = extractTankRig(tank); const vehicle = new TankVehicle(scene, rig, map.spawn);
        const visible = tank.assets.meshes.filter(m => m.isVisible && m.getTotalVertices() > 0);
        const min = visible.reduce((p, m) => Vector3.Minimize(p, m.getBoundingInfo().boundingBox.minimumWorld), new Vector3(Infinity, Infinity, Infinity));
        const max = visible.reduce((p, m) => Vector3.Maximize(p, m.getBoundingInfo().boundingBox.maximumWorld), new Vector3(-Infinity, -Infinity, -Infinity));
        const tick = (throttle = 0, steer = 0, brake = 0) => { vehicle.beforeStep(1 / 60, { throttle, steer, brake }); physics._step(1 / 60); vehicle.afterStep(); };
        const drives: Record<string, unknown>[] = [];
        function drive(points: MapPoint[], id: string) {
          const start = points[0]; const yaw = Math.atan2(points[1].x - start.x, points[1].z - start.z);
          vehicle.reset(new Vector3(start.x, kulTerrainHeight(start.x, start.z), start.z), yaw);
          for (let i = 0; i < 180; i++) tick();
          let waypoint = 1, firstContact: number | undefined, seconds = 0, minUp = 1;
          for (let step = 0; step < 60 * 300; step++) {
            const p = vehicle.node.position, target = points[waypoint];
            const distance = Math.hypot(target.x - p.x, target.z - p.z);
            if (distance < 10) { waypoint++; if (waypoint === points.length) { seconds = step / 60; break; } }
            const next = points[waypoint];
            const desired = Math.atan2(next.x - p.x, next.z - p.z);
            const q = vehicle.current.rotation; const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
            const angle = Math.atan2(Math.sin(desired - yaw), Math.cos(desired - yaw));
            const sharp = Math.abs(angle) > 0.6;
            tick(sharp || vehicle.speed > 7 ? 0 : 0.7, Math.max(-1, Math.min(1, angle * 2 - vehicle.body.getAngularVelocity().y * 0.8)), Math.abs(vehicle.speed) > (sharp ? 2 : 7) ? 0.4 : 0);
            minUp = Math.min(minUp, 1 - 2 * (q.x * q.x + q.z * q.z));
            if (firstContact === undefined && Math.abs(p.z) < 15) firstContact = step / 60;
            assert.ok(Number.isFinite(p.y) && p.y > -35, `${id}: tank arazide kalmalı`);
          }
          assert.ok(seconds > 0, `${tankId}/${id}: rota tamamlanamadı, ${vehicle.node.position.asArray()} waypoint ${waypoint}`);
          assert.ok(minUp > 0.7, `${id}: devrilme`);
          const result = { route: id, firstContactSeconds: firstContact, fullRouteSeconds: seconds, minUp };
          console.log(tankId, result); drives.push(result);
        }
        for (const route of KUL_ROUTES) { drive(route.points, `${route.id}-A-B`); drive([...route.points].reverse(), `${route.id}-B-A`); }
        for (const connection of KUL_CONNECTIONS) { drive(connection.points, `${connection.id}-west-east`); drive([...connection.points].reverse(), `${connection.id}-east-west`); }
        vehicle.reset(map.spawn); for (let i = 0; i < 180; i++) tick();
        let yawTravel = 0, lastYaw = vehicle.current.rotation.toEulerAngles().y, turnSeconds = 0;
        for (let i = 0; i < 60 * 45; i++) {
          tick(0, 1); const yaw = vehicle.current.rotation.toEulerAngles().y;
          yawTravel += Math.abs(Math.atan2(Math.sin(yaw - lastYaw), Math.cos(yaw - lastYaw))); lastYaw = yaw;
          if (yawTravel >= Math.PI) { turnSeconds = i / 60; break; }
        }
        assert.ok(turnSeconds > 0, 'Yerinde 180 derece dönüş');
        results[tankId] = { visibleSizeMetres: max.subtract(min).asArray(), hullSizeMetres: rig.size.asArray(), turn180Seconds: turnSeconds, drives };
        vehicle.dispose(); tank.dispose();
      }
    }
    map.dispose();
    assert.equal(scene.meshes.length, baseline.meshes); assert.equal(scene.materials.length, baseline.materials); assert.equal(scene.textures.length, baseline.textures);
    assert.equal(physics.getBodies().length, 0, 'Fizik kaynakları temizlenmeli');
  }
  await writeFile(new URL('../docs/kul-vadisi-results.json', import.meta.url), JSON.stringify({ description: 'Gerçek GLB + Havok; otomatik rota takibi, insan sürüş/denge kabulü değildir. İlk temas orta hattın 15 m yakınına varıştır; düşmanla karşılaşma değildir.', results }, null, 2) + '\n');
  console.log('Geçti: Kül Vadisi geometri/fizik, yol açıklığı/eğim, doğma görüşü, iki tankla iki yönlü sürüş ve kaynak temizliği.');
} finally { scene.dispose(); engine.dispose(); }
