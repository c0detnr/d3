import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core';
import { FpvFlight, neutralFlight } from '../src/game/drone/FpvFlight.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const hover = new FpvFlight(); hover.launch(new Vector3(0,10,0),0);
for (let i=0;i<60*3600;i++) hover.step(1/60, neutralFlight());
assert.equal(hover.active, true, 'one hour flight has no battery/time cutoff');
assert.equal(hover.position.y,10); assert.equal(hover.batteryPercent>0,true);
assert.equal(hover.launch(Vector3.Zero(),0),false,'cannot relaunch to escape flight');
const input=neutralFlight(); input.forward=1;
const run=(fps:number)=> { const f=new FpvFlight(), clock=new FixedStep(); f.launch(new Vector3(0,10,0),0);
  for(let i=0;i<fps*4;i++) clock.advance(1/fps,dt=>f.step(dt,input)); return f; };
const f30=run(30), f60=run(60), f120=run(120);
assert.ok(Vector3.Distance(f30.position,f60.position)<1e-7); assert.ok(Vector3.Distance(f60.position,f120.position)<1e-7);
for(let i=0;i<180;i++)f60.step(1/60,neutralFlight());
assert.ok(f60.velocity.length()<.01,'assist brakes when released');
// Releasing horizontal movement must brake even while climbing or turning.
for (const lift of [0, 1]) {
  const brake = new FpvFlight(); brake.launch(new Vector3(0,10,0),0);
  brake.velocity.set(26 / Math.sqrt(2), 0, 26 / Math.sqrt(2));
  const start = brake.position.clone(), released = neutralFlight(); released.lift = lift; released.yaw = 1;
  for (let i=0;i<36;i++) brake.step(1/60,released);
  assert.equal(Math.hypot(brake.velocity.x,brake.velocity.z),0,'assist fully stops horizontally within 0.6 s');
  assert.ok(Math.hypot(brake.position.x-start.x,brake.position.z-start.z)<2.5,'assist stopping distance stays below 2.5 m at full speed');
  const stopped = brake.position.clone();
  for (let i=0;i<600;i++) { brake.look(2,1); brake.step(1/60,released); }
  assert.equal(brake.position.x,stopped.x); assert.equal(brake.position.z,stopped.z,'looking and yaw cannot restart drift');
  if (!lift) assert.equal(brake.position.y,stopped.y,'neutral assist holds altitude');
  else assert.ok(brake.position.y>stopped.y,'horizontal braking does not block climb');
}
const verticalBrake = new FpvFlight(); verticalBrake.launch(new Vector3(0,10,0),0); verticalBrake.velocity.y=12;
for (let i=0;i<36;i++) verticalBrake.step(1/60,neutralFlight());
assert.equal(verticalBrake.velocity.y,0,'releasing climb fully arrests vertical drift');
const acro=new FpvFlight(); acro.mode='ACRO'; acro.launch(new Vector3(0,20,0),0);
const pitch=neutralFlight(); pitch.pitch=1;
for(let i=0;i<20;i++)acro.step(1/60,pitch);
const attitude=acro.rotation.clone();
for(let i=0;i<60;i++)acro.step(1/60,neutralFlight());
assert.ok(acro.rotation.equalsWithEpsilon(attitude,1e-8),'acro does not auto-level');
assert.ok(acro.velocity.z>1,'forward pitch accelerates forward');
assert.ok(acro.position.y<20,'tilting loses lift without added throttle');
const drop=neutralFlight();drop.lift=-1;
for(let i=0;i<120;i++)acro.step(1/60,drop);
assert.equal(acro.throttle,0);assert.ok(acro.velocity.y<0);
assert.equal(acro.end(),true);assert.equal(acro.end(),false,'terminal callback cannot fire twice');
const end=acro.position.clone();acro.step(1, input);assert.ok(acro.position.equals(end));
console.log('FPV PASS: no timeout, hover, frame independence, assist braking, acro body thrust / attitude / gravity, launch and terminal guards');
