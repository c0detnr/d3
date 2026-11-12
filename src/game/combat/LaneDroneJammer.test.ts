import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from '@babylonjs/core';
import { LaneDroneModel, inJammerField } from './LaneDroneModel.ts';

test('enemy drones inside the 10 m tank jammer neither move nor fire; outside and friendly ones do', () => {
  const jammer = { team: 'A' as const, position: new Vector3(0, 0, 0), radius: 10 };
  assert.equal(inJammerField({ team: 'B', position: new Vector3(9.9, 3, 0) }, [jammer]), true);
  assert.equal(inJammerField({ team: 'B', position: new Vector3(10.1, 0, 0) }, [jammer]), false);
  assert.equal(inJammerField({ team: 'A', position: new Vector3(1, 0, 0) }, [jammer]), false);

  const model = new LaneDroneModel(() => 0);
  model.update(30, [], () => true, () => true, () => {});
  const drone = model.drones.find(d => d.team === 'B')!;
  const near = { team: 'A' as const, position: drone.position.add(new Vector3(4, 0, 0)), radius: 10 };
  const start = drone.position.clone(); let shots = 0;
  const tank = { id: 'tank', team: 'A' as const, position: near.position, hp: 100 };
  model.update(1, [tank], () => true, () => true, ({ shooter }) => { if (shooter === drone) shots++; }, [near]);
  assert.equal(drone.jammed, true); assert.equal(shots, 0); assert.ok(drone.position.equals(start));
  model.update(1, [tank], () => true, () => true, ({ shooter }) => { if (shooter === drone) shots++; }, []);
  assert.equal(drone.jammed, false); assert.ok(shots > 0);
});
