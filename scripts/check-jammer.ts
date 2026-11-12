import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ArcRotateCamera, HavokPlugin, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { JAMMER_EFFECT, KUL_JAMMERS, signalQuality } from '../src/game/world/jammerLayout.ts';
import { createJammers } from '../src/game/world/createJammers.ts';
import { kulTerrainHeight, KUL_SPAWNS } from '../src/game/world/kulVadisiLayout.ts';
import { FpvFlight, neutralFlight } from '../src/game/drone/FpvFlight.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const antenna = { x:0, y:15, z:0 };
assert.equal(signalQuality(antenna,[]),1);
assert.equal(signalQuality({ x:121,y:15,z:0 },[antenna]),1);
assert.equal(signalQuality({ x:120,y:15,z:0 },[antenna]),1);
assert.equal(signalQuality({ x:35,y:15,z:0 },[antenna]),0);
assert.equal(signalQuality(antenna,[antenna]),0);
assert.equal(signalQuality({ x:0,y:136,z:0 },[antenna]),1,'distance includes altitude');
let last=0;
for(let distance=35;distance<=120;distance++) {
  const quality=signalQuality({x:distance,y:15,z:0},[antenna]);
  assert.ok(quality>=last && quality>=0 && quality<=1); last=quality;
}
assert.equal(signalQuality(antenna,[{x:500,y:15,z:0},antenna]),0,'worst overlapping field wins');
const worldJammers=KUL_JAMMERS.map(p=>({...p,y:p.y+kulTerrainHeight(p.x,p.z)}));
for(const spawn of Object.values(KUL_SPAWNS)) assert.equal(signalQuality({...spawn,y:kulTerrainHeight(spawn.x,spawn.z)+4},worldJammers),1,'spawn stays outside fields');
for(const mode of ['ASSIST','ACRO'] as const) {
  const a=new FpvFlight(), b=new FpvFlight(); a.mode=b.mode=mode;
  for(const f of [a,b]) {
    f.launch(new Vector3(0,100,0),0);
    for(let i=0;i<29;i++) f.step(1/60,neutralFlight(),0);
    assert.equal(f.controlLost,false,'29 steps still allow full controls');
    f.step(1/60,neutralFlight(),0);
    assert.equal(f.controlLost,true,'disconnect at 0.5 s');
  }
  const position=a.position.clone(), yaw=a.yaw;
  const everything={forward:1,right:1,lift:1,yaw:1,pitch:1,roll:1};
  for(let i=0;i<60;i++) { a.look(100,100); a.step(1/60,everything,1); b.step(1/60,neutralFlight(),1); }
  assert.ok(a.position.equalsWithEpsilon(b.position,1e-8),'all inputs ignored even after leaving field');
  assert.equal(a.yaw,yaw); assert.ok(a.position.y<position.y-4,'gravity drops drone'); assert.equal(a.throttle,0);
  a.end(); a.launch(new Vector3(0,100,0),0); assert.equal(a.controlLost,false,'new launch resets receiver');
}
const dip=new FpvFlight(); dip.launch(new Vector3(0,100,0),0);
for(let cycle=0;cycle<3;cycle++) { for(let i=0;i<20;i++) dip.step(1/60,neutralFlight(),0); dip.step(1/60,neutralFlight(),.01); }
assert.equal(dip.controlLost,false,'short dips do not accumulate');
const input=neutralFlight();input.forward=1;
const weak=new FpvFlight(), clear=new FpvFlight();
for(const f of [weak,clear])f.launch(new Vector3(0,100,0),0);
for(let i=0;i<60;i++) { weak.step(1/60,input,.001); clear.step(1/60,input,1); }
assert.ok(weak.position.equals(clear.position),'any positive quality preserves full control');
const positions=[30,60,120].map(fps=> {
  const f=new FpvFlight(), clock=new FixedStep(); f.launch(new Vector3(0,100,0),0);
  for(let i=0;i<fps;i++)clock.advance(1/fps,dt=>f.step(dt,neutralFlight(),0)); return f.position;
});
assert.ok(positions[0].equalsWithEpsilon(positions[1],1e-8)); assert.ok(positions[1].equalsWithEpsilon(positions[2],1e-8));

const wasmBinary=await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url));
const havok=await HavokPhysics({wasmBinary}); const engine=new NullEngine(), scene=new Scene(engine);
new ArcRotateCamera('check',0,1,20,Vector3.Zero(),scene);
scene.enablePhysics(new Vector3(0,-9.81,0),new HavokPlugin(true,havok));
const baseline={meshes:scene.meshes.length,materials:scene.materials.length,bodies:scene.getPhysicsEngine()!.getBodies().length,observers:scene.onBeforeRenderObservable.observers.length};
for(let cycle=0;cycle<2;cycle++) {
  const towers=createJammers(scene,kulTerrainHeight); assert.equal(towers.positions.length,3);
  scene.render();
  for(const p of towers.positions) {
    const hit=scene.getPhysicsEngine()!.raycast(new Vector3(p.x,p.y,p.z-5),new Vector3(p.x,p.y,p.z+5));
    assert.equal(hit.hasHit,true,'antenna is solid to projectile/drone sweeps');
    const base=kulTerrainHeight(p.x,p.z);
    const foot=scene.getPhysicsEngine()!.raycast(new Vector3(p.x-5,base+.3,p.z),new Vector3(p.x+5,base+.3,p.z));
    assert.equal(foot.hasHit,true,'tank-height foundation is solid');
  }
  towers.dispose();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(scene.meshes.length,baseline.meshes); assert.equal(scene.materials.length,baseline.materials);
  assert.equal(scene.getPhysicsEngine()!.getBodies().length,baseline.bodies); assert.equal(scene.onBeforeRenderObservable.observers.length,baseline.observers);
}
scene.dispose();engine.dispose();
console.log(`JAMMER PASS: ${JAMMER_EFFECT.innerRadius}/${JAMMER_EFFECT.outerRadius} m boundaries, monotonic overlap/altitude, clear spawns, 0.5 s irreversible dropout, full weak-link controls, 30/60/120 FPS, Havok collisions and cleanup`);
