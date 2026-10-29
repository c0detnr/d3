import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ArcRotateCamera, HavokPlugin, LoadAssetContainerAsync, NullEngine, Ray, Scene, Vector3, type Mesh, type PhysicsEngineV2 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { KUL_FIELD_COVER, KUL_FIELD_ROCKS } from '../src/game/world/kulBattlefieldLayout.ts';
import { KUL_FIELD_CROSSINGS, KUL_FIELD_LANDMARKS, KUL_LANDMARK_CLEARANCE } from '../src/game/world/kulLandmarkLayout.ts';
import { KUL_STRUCTURES, kulRoadDistance, kulTerrainHeight } from '../src/game/world/kulVadisiLayout.ts';
import {
  DRAGON_TOOTH, KUL_DRAGON_TEETH_ROWS, KUL_HEDGE_ROWS, KUL_HEDGEHOG_GROUPS, KUL_POLE_LINES, KUL_SANDBAG_LINES, SANDBAG,
  hedgehogPositions, kulFieldPropPieces, lineSegments, localToWorld, toothPositions,
} from '../src/game/world/kulFieldPropsLayout.ts';
import { createKulFieldProps, fieldPropSources } from '../src/game/world/createKulFieldProps.ts';

const TANK_GAP = 7;
const rectDistance = (x: number, z: number, s: { x: number; z: number; width: number; depth: number }) =>
  Math.hypot(Math.max(0, Math.abs(x - s.x) - s.width / 2), Math.max(0, Math.abs(z - s.z) - s.depth / 2));
const angle = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

// Placement: centre distance minus footprint radius bounds every footprint point (distances are 1-Lipschitz).
const pieces = kulFieldPropPieces();
for (const p of pieces) {
  const at = `${p.id} (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`;
  assert.ok(Math.abs(p.x) <= 115 && Math.abs(p.z) <= 160, `${at}: merkez savaş alanında`);
  assert.ok(kulRoadDistance(p.x, p.z) - p.radius >= 14, `${at}: yoldan 14 m`);
  for (const x of KUL_FIELD_CROSSINGS) assert.ok(Math.abs(p.x - x) - p.radius >= 7, `${at}: x=${x} sürüş hattından 7 m`);
  for (const c of KUL_FIELD_COVER) assert.ok(rectDistance(p.x, p.z, c) - p.radius >= 6, `${at}: beton mevziden 6 m`);
  for (const r of KUL_FIELD_ROCKS) assert.ok(Math.hypot(p.x - r.x, p.z - r.z) - p.radius >= r.scale + 4, `${at}: kayadan uzak`);
  for (const s of KUL_STRUCTURES) assert.ok(rectDistance(p.x, p.z, s) - p.radius >= 10, `${at}: ${s.id} yapısından 10 m`);
  for (const l of KUL_FIELD_LANDMARKS) assert.ok(Math.hypot(p.x - l.x, p.z - l.z) - p.radius >= KUL_LANDMARK_CLEARANCE[l.kind], `${at}: ${l.id} açıklığı`);
  // Rows and groups never close a lane: distinct hard objects keep a tank-wide gap.
  if (p.hard) for (const q of pieces) if (q.hard && q.id !== p.id) {
    assert.ok(Math.hypot(p.x - q.x, p.z - q.z) - p.radius - q.radius >= TANK_GAP, `${p.id} ↔ ${q.id}: tank geçişi ≥ ${TANK_GAP} m`);
  }
  const twin = pieces.find(q => q.kind === p.kind && q.team !== p.team && Math.hypot(q.x + p.x, q.z + p.z) < 1e-6 && Math.abs(q.radius - p.radius) < 1e-9);
  assert.ok(twin, `${at}: nokta simetrik eş`);
  const turn = Math.abs(angle(twin.yaw - p.yaw) - Math.PI);
  assert.ok(p.kind === 'pole' || p.kind === 'barbed-wire' || turn < 1e-6, `${at}: eş yaw + π`);
}
const count = (team: 'A' | 'B') => pieces.filter(p => p.team === team).length;
assert.equal(count('A'), count('B'), 'İki takım eşit');

const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary });
const engine = new NullEngine(); const scene = new Scene(engine);
new ArcRotateCamera('check', 0, 1, 20, Vector3.Zero(), scene);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
const physics = scene.getPhysicsEngine() as PhysicsEngineV2;
const sources = Object.fromEntries(await Promise.all(Object.entries(fieldPropSources).map(async ([key, url]) =>
  [key, new Uint8Array(await readFile(new URL(url)))]))) as Record<keyof typeof fieldPropSources, Uint8Array>;
// glTF creates a shared scene BRDF texture on first load; it is owned by Scene.
(await LoadAssetContainerAsync(sources.tallGrass, scene, { pluginExtension: '.glb' })).dispose();
const baseline = { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length, nodes: scene.transformNodes.length };

try {
  const props = await createKulFieldProps(scene, sources); scene.render();
  const ground = (x: number, z: number) => kulTerrainHeight(x, z);
  const cast = (from: Vector3, to: Vector3) => physics.raycast(from, to);
  const across = (x: number, z: number, yaw: number, y: number, half: number) => {
    const nx = Math.sin(yaw) * half, nz = Math.cos(yaw) * half; // perpendicular to local +x
    return cast(new Vector3(x - nx, y, z - nz), new Vector3(x + nx, y, z + nz));
  };
  const hitProp = (hit: ReturnType<typeof cast>) => hit.hasHit ? hit.body?.transformNode.metadata?.prop : undefined;

  // Hard cover stops a horizontal shell ray; ends of every row leave a tank-wide lane.
  KUL_DRAGON_TEETH_ROWS.forEach(row => {
    const teeth = toothPositions(row);
    for (const p of teeth) {
      const g = ground(p.x, p.z);
      assert.equal(hitProp(across(p.x, p.z, row.yaw, g + 0.6, 3)), 'dragon-teeth', 'Ejderha dişi mermiyi durdurur');
      const mesh = scene.getMeshByName(`field-dragon-teeth-${KUL_DRAGON_TEETH_ROWS.indexOf(row)}`)!;
      assert.ok(mesh.getBoundingInfo().boundingBox.minimumWorld.y < g, 'Diş zemine gömülü');
    }
    for (const end of [-1, 1]) for (const offset of [1, 3.5, TANK_GAP - 0.5]) {
      const p = localToWorld(row, end * ((row.count - 1) / 2 * DRAGON_TOOTH.spacing + DRAGON_TOOTH.base / 2 + offset), 0);
      assert.ok(!across(p.x, p.z, row.yaw, ground(p.x, p.z) + 0.7, 6).hasHit, 'Sıra ucunda tank geçişi açık');
    }
  });
  KUL_HEDGEHOG_GROUPS.forEach(group => hedgehogPositions(group).forEach(p => {
    const hit = cast(new Vector3(p.x, ground(p.x, p.z) + 6, p.z), new Vector3(p.x, ground(p.x, p.z) - 1, p.z));
    assert.equal(hitProp(hit), 'hedgehogs', 'Kirpi kesişimi sert');
    assert.ok(hit.hitPointWorld.y - ground(p.x, p.z) > 0.4, 'Kirpi ayakları üstünde durur');
  }));
  for (const line of KUL_SANDBAG_LINES) for (const s of lineSegments(line.points)) {
    const g = ground(s.x, s.z);
    assert.equal(hitProp(across(s.x, s.z, s.yaw, g + 0.8, 2)), 'sandbags', 'Kum torbası hattı gövdeyi saklar');
    assert.ok(!across(s.x, s.z, s.yaw, g + 1.45, 2).hasHit, 'Hat 1.3 m üstünde ateşe açık');
    assert.ok(s.length >= 3 && s.length <= 6, 'Kırık hat parçası');
  }
  for (const line of KUL_SANDBAG_LINES) {
    const length = lineSegments(line.points).reduce((sum, s) => sum + s.length, 0);
    assert.ok(length >= 6 && length <= 10, `Kum torbası hattı ${length.toFixed(1)} m`);
  }
  KUL_POLE_LINES.forEach(line => line.points.forEach(p => {
    const d = 3, x = p.x + Math.sin(p.lean) * Math.sin(p.leanYaw) * d, z = p.z + Math.sin(p.lean) * Math.cos(p.leanYaw) * d;
    const y = ground(p.x, p.z) - 0.4 + Math.cos(p.lean) * d;
    assert.equal(hitProp(cast(new Vector3(x + Math.cos(p.leanYaw) * 2, y, z - Math.sin(p.leanYaw) * 2), new Vector3(x - Math.cos(p.leanYaw) * 2, y, z + Math.sin(p.leanYaw) * 2))), 'pole', 'Direk gövdesi sert');
  }));

  // Soft cover and dressing: no bodies, not pickable, shells pass; hedges still block sight.
  const soft = props.meshes.filter(m => !m.metadata.hardCover);
  assert.ok(soft.length > 0 && soft.every(m => !m.physicsBody && !m.isPickable), 'Yumuşak siper/dekorda fizik yok');
  const hedges = props.meshes.filter(m => m.metadata.prop === 'hedge');
  for (const p of pieces.filter(p => !p.hard)) assert.ok(!across(p.x, p.z, p.yaw, ground(p.x, p.z) + 0.5, 1.5).hasHit, `${p.id}: mermi geçer`);
  KUL_HEDGE_ROWS.forEach(row => [-0.3, 0, 0.3].forEach(t => {
    const p = localToWorld(row, t * row.length, 0), nx = Math.sin(row.yaw) * 4, nz = Math.cos(row.yaw) * 4, y = ground(p.x, p.z) + 1.3;
    const ray = Ray.CreateNewFromTo(new Vector3(p.x - nx, y, p.z - nz), new Vector3(p.x + nx, y, p.z + nz));
    assert.ok(hedges.some(m => ray.intersectsMesh(m as Mesh, false).hit), 'Çalılık 1.3 m görüş hattını keser');
  }));

  const bodies = physics.getBodies().length;
  const expected = KUL_DRAGON_TEETH_ROWS.length + KUL_HEDGEHOG_GROUPS.length + KUL_POLE_LINES.length
    + KUL_SANDBAG_LINES.reduce((n, l) => n + l.points.length - 1, 0);
  assert.equal(bodies, expected, 'Yalnız basit statik siper gövdeleri');
  const bags = scene.getMeshByName('field-sandbags')!.getTotalVertices() / 24;
  const summary = {
    meshes: props.meshes.length, bodies, sandbags: bags,
    teeth: KUL_DRAGON_TEETH_ROWS.reduce((n, r) => n + r.count, 0), hedgehogs: KUL_HEDGEHOG_GROUPS.length * 3,
    sandbagLines: KUL_SANDBAG_LINES.length, hedgeRows: KUL_HEDGE_ROWS.length, poles: KUL_POLE_LINES.reduce((n, l) => n + l.points.length, 0),
    sandbagHeight: SANDBAG.layers * SANDBAG.height,
  };
  props.dispose();
  assert.deepEqual({ meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length, nodes: scene.transformNodes.length }, baseline, 'Kaynaklar temizlenir');
  assert.equal(physics.getBodies().length, 0, 'Fizik gövdeleri temizlenir');
  console.log(summary);
  console.log('Geçti: alan nesneleri yerleşim, simetri, tank geçişi, sert/yumuşak siper ve kaynak temizliği.');
} finally { scene.dispose(); engine.dispose(); }
