import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { ArcRotateCamera, HavokPlugin, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { KUL_FIELD_COVER, KUL_FIELD_ROCKS, KUL_FIELD_RELIEF } from '../src/game/world/kulBattlefieldLayout.ts';
import { createKulVadisi } from '../src/game/world/createKulVadisi.ts';
import { KUL_ROUTES, KUL_CONNECTIONS, KUL_STRUCTURES, KUL_SPAWNS, KUL_STEP, kulTerrainHeight, kulRoadDistance, type MapPoint } from '../src/game/world/kulVadisiLayout.ts';
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
  emplacement: new Uint8Array(await readFile(new URL('../assets/environment/concrete_emplacement_01/concrete_emplacement_01.glb', import.meta.url))),
  hangar: new Uint8Array(await readFile(new URL('../assets/environment/maintenance_hangar_01/maintenance_hangar_01.glb', import.meta.url))),
  workshop: new Uint8Array(await readFile(new URL('../assets/environment/maintenance_workshop_01/maintenance_workshop_01.glb', import.meta.url))),
  command: new Uint8Array(await readFile(new URL('../assets/environment/command_center_01/command_center_01.glb', import.meta.url))),
};
const natureSources = {
  rock1: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Rock_Medium_1.glb', import.meta.url))),
  rock2: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Rock_Medium_2.glb', import.meta.url))),
  pine: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Pine_5.glb', import.meta.url))),
  pineTall: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Pine_2.glb', import.meta.url))),
  deadTree: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/DeadTree_2.glb', import.meta.url))),
  broadTree: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/CommonTree_3.glb', import.meta.url))),
  rock3: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Rock_Medium_3.glb', import.meta.url))),
  pebble: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Pebble_Square_2.glb', import.meta.url))),
  shortGrass: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Grass_Common_Short.glb', import.meta.url))),
  fern: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Fern_1.glb', import.meta.url))),
  bush: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Bush_Common.glb', import.meta.url))),
  grass: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Grass_Wispy_Short.glb', import.meta.url))),
};
const propSources = {
  bushFlowers: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Bush_Common_Flowers.glb', import.meta.url))),
  tallGrass: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Grass_Common_Tall.glb', import.meta.url))),
};
const landmarkSources = {
  ruin: new Uint8Array(await readFile(new URL('../assets/environment/farmhouse_ruin_01/farmhouse_ruin_01.glb', import.meta.url))),
  wreck: new Uint8Array(await readFile(new URL('../assets/environment/armored_wreck_01/armored_wreck_01.glb', import.meta.url))),
};
const results: Record<string, unknown> = {};
try {
  for (let cycle = 0; cycle < 2; cycle++) {
    const map = await createKulVadisi(scene, 'A', factorySources, natureSources, propSources, landmarkSources); scene.render();
    assert.equal(KUL_STRUCTURES.filter(s => s.kind === 'outer').length, 0);
    assert.equal(KUL_STRUCTURES.filter(s => s.kind === 'inner').length, 0);
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
      const sign = team === 'A' ? 1 : -1;
      assert.equal(scene.getMeshByName(`${team}-spawn-screen`), null, 'Yüksek doğma duvarı kaldırıldı');
      // Sweep the tank-width openings at hull height; both exits and the forward view stay clear.
      for (const gateX of [0, 78]) for (const dx of [-3, 0, 3]) {
        const x = sign * (gateX + dx);
        const hit = physics.raycast(new Vector3(x, 1.5, sign * -276), new Vector3(x, 1.5, sign * -252));
        assert.ok(!hit.hasHit, `${team}: ${gateX} çıkışı tank genişliğinde açık`);
      }
      assert.ok(!physics.raycast(new Vector3(spawn.x, 3, spawn.z), new Vector3(0, 3, sign * -210)).hasHit, `${team}: ileri görüş açık`);
      for (const s of KUL_STRUCTURES.filter(s => s.team === team && s.kind === 'emplacement')) {
        const meshes = scene.meshes.filter(m => m.metadata?.structure === s.id);
        const colliders = meshes.filter(m => m.metadata?.gltf?.extras?.collision_only);
        assert.equal(colliders.length, 7);
        assert.ok(colliders.every(m => !m.isVisible && !m.isPickable));
        const hit = physics.raycast(new Vector3(s.x, 1.5, s.z - 5), new Vector3(s.x, 1.5, s.z + 5));
        assert.equal(hit.body?.transformNode.metadata?.structure, s.id, `${s.id}: siper mermiyi durdurur`);
        const buttress = colliders.find(m => m.name.startsWith('COL_RearButtress'))!;
        assert.equal(Math.sign(buttress.getBoundingInfo().boundingBox.centerWorld.z - s.z), -sign, 'Payandalar avluya bakar');
      }
    }
    for (const id of ['A-hangar', 'B-hangar', 'A-workshop', 'B-workshop', 'factory-hangar', 'factory-workshop', 'factory-store']) {
      assert.equal(scene.getMeshByName(`${id}-mark`), null, 'No placeholder roof marker');
      const structure = KUL_STRUCTURES.find(s => s.id === id)!;
      const meshes = scene.meshes.filter(m => m.metadata?.structure === id);
      const visible = meshes.filter(m => m.isVisible);
      const colliders = meshes.filter(m => m.metadata?.gltf?.extras?.collision_only);
      assert.equal(colliders.length, structure.kind === 'hangar' ? 3 : 6);
      assert.ok(colliders.every(m => !m.isVisible && !m.isPickable), 'Collision geometry is hidden');
      if (structure.team && structure.kind === 'hangar') {
        const facade = visible.find(m => m.name === 'MH01_Recess_Geometry')!;
        assert.ok((facade.getBoundingInfo().boundingBox.centerWorld.z - structure.z) * (structure.team === 'B' ? -1 : 1) > 0, `${id}: hangar courtyard orientation`);
      }
      const minY = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.y));
      assert.ok(Math.abs(minY - kulTerrainHeight(structure.x, structure.z)) < 0.001, 'Building grounded');
      const minX = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.x));
      const maxX = Math.max(...visible.map(m => m.getBoundingInfo().boundingBox.maximumWorld.x));
      assert.ok(maxX - minX <= structure.width + 0.01, 'Metre scale footprint');
      for (const dx of [-structure.width / 2, 0, structure.width / 2]) for (const dz of [-structure.depth / 2, 0, structure.depth / 2]) {
        assert.ok(Math.abs(kulTerrainHeight(structure.x + dx, structure.z + dz) - minY) < 0.001, 'Level pad');
      }
      const from = new Vector3(structure.x, minY + 2, structure.z + (structure.team === 'B' ? -1 : 1) * (structure.depth / 2 + 5));
      const hit = physics.raycast(from, new Vector3(structure.x, minY + 2, structure.z));
      assert.ok(hit.hasHit && hit.body?.transformNode.metadata?.structure === id, `${id}: actual GLB blocks projectiles`);
      assert.equal(hit.body?.transformNode.metadata.surface, structure.kind === 'hangar' ? 'metal' : 'concrete');
      for (const side of [-1, 1]) {
        const x = structure.x + side * (structure.width / 2 + 3);
        const hit = physics.raycast(new Vector3(x, minY + 2, structure.z - structure.depth / 2 - 3), new Vector3(x, minY + 2, structure.z + structure.depth / 2 + 3));
        assert.ok(!hit.hasHit, `${id}: no invisible box outside building`);
      }
    }
    for (const id of ['A-command', 'B-command']) {
      assert.equal(scene.getMeshByName(id), null, 'Komuta merkezi artık geçici kutu değil');
      const structure = KUL_STRUCTURES.find(s => s.id === id)!;
      const meshes = scene.meshes.filter(m => m.metadata?.structure === id);
      const visible = meshes.filter(m => m.isVisible);
      const colliders = meshes.filter(m => m.metadata?.gltf?.extras?.collision_only);
      assert.equal(colliders.length, 5);
      assert.ok(colliders.every(m => !m.isVisible && !m.isPickable), 'Collision geometry is hidden');
      const bounds = visible.map(m => m.getBoundingInfo().boundingBox);
      const minY = Math.min(...bounds.map(b => b.minimumWorld.y));
      const sizeX = Math.max(...bounds.map(b => b.maximumWorld.x)) - Math.min(...bounds.map(b => b.minimumWorld.x));
      const sizeZ = Math.max(...bounds.map(b => b.maximumWorld.z)) - Math.min(...bounds.map(b => b.minimumWorld.z));
      assert.ok(Math.abs(minY - kulTerrainHeight(structure.x, structure.z)) < 0.001, `${id}: zemine oturur`);
      assert.ok(Math.abs(sizeX - structure.width) < 0.01 && Math.abs(sizeZ - structure.depth) < 0.01, `${id}: metre ölçeği`);
      for (const dx of [-structure.width / 2, 0, structure.width / 2]) for (const dz of [-structure.depth / 2, 0, structure.depth / 2]) {
        assert.ok(Math.abs(kulTerrainHeight(structure.x + dx, structure.z + dz) - minY) < 0.001, `${id}: düz taban`);
      }
      // The armoured door faces the battlefield (toward z = 0), like the hangar facade.
      const door = visible.find(m => m.name === 'Recess_Geometry')!.getBoundingInfo().boundingBox.centerWorld.z;
      assert.ok((door - structure.z) * (structure.team === 'B' ? -1 : 1) > 0, `${id}: kapı savaş alanına bakar`);
      const toward = structure.team === 'B' ? -1 : 1;
      const from = new Vector3(structure.x, minY + 3, structure.z + toward * (structure.depth / 2 + 8));
      const hit = physics.raycast(from, new Vector3(structure.x, minY + 3, structure.z));
      assert.ok(hit.hasHit && hit.body?.transformNode.metadata?.structure === id, `${id}: mermiyi durduran gövde`);
      assert.equal(hit.body?.transformNode.metadata.surface, 'concrete');
      for (const side of [-1, 1]) {
        const x = structure.x + side * (structure.width / 2 + 3);
        const miss = physics.raycast(new Vector3(x, minY + 3, structure.z - structure.depth / 2 - 3), new Vector3(x, minY + 3, structure.z + structure.depth / 2 + 3));
        assert.ok(miss.body?.transformNode.metadata?.structure !== id, `${id}: bina dışında görünmez kutu yok`);
      }
    }
    for (const [i, p] of KUL_FIELD_COVER.entries()) {
      const mesh = scene.getTransformNodeByName(`field-cover-${i}`)!;
      assert.ok(mesh, 'Hazır mevzi yüklendi');
      const colliders = scene.meshes.filter(m => m.metadata?.structure === `field-cover-${i}` && m.metadata?.gltf?.extras?.collision_only);
      assert.equal(colliders.length, 7);
      assert.ok(colliders.every(m => !m.isVisible && !m.isPickable));
      assert.ok(colliders.every(m => m.metadata.surface === 'concrete'));
      const visible = scene.meshes.filter(m => m.metadata?.structure === `field-cover-${i}` && m.isVisible);
      const bounds = visible.map(m => m.getBoundingInfo().boundingBox);
      const minX = Math.min(...bounds.map(b => b.minimumWorld.x)), maxX = Math.max(...bounds.map(b => b.maximumWorld.x));
      const minZ = Math.min(...bounds.map(b => b.minimumWorld.z)), maxZ = Math.max(...bounds.map(b => b.maximumWorld.z));
      const groundY = Math.min(...bounds.map(b => b.minimumWorld.y));
      assert.ok(Math.abs(maxX - minX - 8.4) < .001 && Math.abs(maxZ - minZ - 3.5) < .001, 'Mevzi metre ölçeğinde');
      assert.ok(Math.abs((minX + maxX) / 2 - p.x) < .001 && Math.abs((minZ + maxZ) / 2 - p.z) < .001, 'Mevzi noktaya ortalı');
      assert.ok(Math.abs(groundY - kulTerrainHeight(p.x, p.z)) < .001, 'Mevzi zemine oturur');
      const buttress = colliders.find(m => m.name.startsWith('COL_RearButtress'))!;
      assert.equal(Math.sign(buttress.getBoundingInfo().boundingBox.centerWorld.z - p.z), Math.sign(p.z), 'Payandalar cepheden uzağa bakar');
      for (const side of [-1, 1]) {
        const x = p.x + side * 3.9, y = groundY + 2.4;
        const hit = physics.raycast(new Vector3(x, y, p.z - 1.9), new Vector3(x, y, p.z + 1.9));
        assert.ok(!hit.hasHit, 'Kırık üst köşe görünmez duvarla kapanmaz');
      }
      const y = kulTerrainHeight(p.x, p.z) + 1.5;
      const from = new Vector3(p.x, y, p.z - p.depth);
      const hit = physics.raycast(from, new Vector3(p.x, y, p.z + p.depth));
      assert.ok(hit.hasHit && hit.body?.transformNode.metadata?.structure === `field-cover-${i}`, `Beton siper ${i}: ${hit.body?.transformNode.name}, pos ${mesh.position.asArray()}`);
      for (const side of [-1, 1]) {
        const x = p.x + side * 3.9, y = kulTerrainHeight(p.x, p.z) + 2.4;
        assert.ok(!physics.raycast(new Vector3(x, y, p.z - p.depth), new Vector3(x, y, p.z + p.depth)).hasHit, 'Broken upper corners have no invisible wall');
      }
      // Both ends have enough space for a tank to pass around the cover.
      for (const side of [-1, 1]) {
        const x = p.x + side * (p.width / 2 + 4);
        const y = Math.max(...[-7, 0, 7].map(dz => kulTerrainHeight(x, p.z + dz))) + 2;
        const ray = physics.raycast(new Vector3(x, y, p.z - 7), new Vector3(x, y, p.z + 7));
        assert.ok(!ray.hasHit, `Siper ${i} yanında geçiş açık`);
      }
    }
    for (let i = 0; i < KUL_FIELD_ROCKS.length; i++) {
      const mesh = scene.meshes.find(m => m.name.startsWith(`field-rock-${i}-`) && m.getTotalVertices() > 0)!;
      assert.ok(mesh, 'Hazır kaya yüklendi');
      const bounds = mesh.getBoundingInfo().boundingBox;
      const center = bounds.centerWorld;
      const hit = physics.raycast(center.add(new Vector3(0, 12, 0)), center);
      assert.ok(hit.hasHit && hit.body?.transformNode.metadata?.hardCover, 'Kaya sert siperdir');
    }
    for (const mesh of scene.meshes.filter(m => m.getTotalVertices() > 0 && (m.name.startsWith('field-plant-') || m.name.startsWith('field-rubble-')))) {
      assert.ok(!mesh.physicsBody && !mesh.isPickable, 'Küçük dekor tankı veya mermiyi durdurmaz');
    }
    const trees = scene.meshes.filter(m => m.metadata?.treeTrunk);
    assert.ok(trees.length >= 40, 'Wooded ridge and scattered dead trees loaded');
    for (const trunk of trees) {
      assert.ok(kulRoadDistance(trunk.position.x, trunk.position.z) > 13, 'Tree trunks leave routes clear');
      assert.ok(!trunk.isVisible && trunk.physicsBody, 'Only simple hidden trunks receive physics');
      const hit = physics.raycast(trunk.position.add(new Vector3(-2, 0, 0)), trunk.position.add(new Vector3(2, 0, 0)));
      assert.ok(hit.hasHit && hit.body?.transformNode === trunk, 'Trunk blocks projectiles');
    }
    results.nature = { trees: trees.length, quarryRocks: scene.meshes.filter(m => m.name.startsWith('quarry-rock-') && m.getTotalVertices() > 0).length,
      decorativePlants: scene.meshes.filter(m => /^(ridge-understory|creek-plant|creek-pebble)-/.test(m.name) && m.getTotalVertices() > 0).length };
    for (const p of KUL_FIELD_RELIEF) assert.ok(Number.isFinite(kulTerrainHeight(p.x, p.z)));
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
        for (const x of [-35, 35]) {
          const points = [-150, -40, 40, 150].map(z => ({ x, z }));
          drive(points, `field-${x}-A-B`); drive([...points].reverse(), `field-${x}-B-A`);
        }
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
