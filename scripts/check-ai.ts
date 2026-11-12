import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { EasyDuelAI } from '../src/game/combat/EasyDuelAI.ts';
import { EASY_AI_CONFIG } from '../src/game/combat/easyAIConfig.ts';
import type { DuelTank } from '../src/game/combat/DuelTank.ts';

const createActor = (x: number, z: number, yaw = 0, speed = 0) => {
  const rotationQuaternion = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
  return {
    vehicle: {
      speed,
      node: {
        position: new Vector3(x, 0, z),
        rotationQuaternion,
      },
    },
  } as unknown as Pick<DuelTank, 'vehicle'>;
};

// 1. STUCK RECOVERY TEST: Recovers from obstacle/tree in X seconds
function testStuckRecovery() {
  const ai = new EasyDuelAI();
  const self = createActor(0, 0);
  const target = createActor(0, 80);

  // Tank is driving towards target but blocked by an obstacle right in front.
  const dt = 1 / 60;
  let recoveredInSeconds: number | null = null;
  let phaseTurnSeen = false;

  for (let frame = 0; frame < 180; frame++) {
    const elapsed = frame * dt;
    // self stays at (0, 0) because obstacle stops it
    const decision = ai.update(self, target, true, dt);
    if (decision.drive.throttle < 0 && recoveredInSeconds === null) {
      recoveredInSeconds = elapsed;
    }
    if (decision.drive.throttle > 0 && recoveredInSeconds !== null) {
      phaseTurnSeen = true;
    }
  }

  assert.ok(recoveredInSeconds !== null, 'Stuck detection must trigger recovery');
  assert.ok(
    recoveredInSeconds <= 1.5,
    `Stuck recovery triggered in ${recoveredInSeconds.toFixed(2)}s (expected <= 1.5s)`,
  );
  assert.ok(phaseTurnSeen, 'Recovery transitions to bypass/turn maneuver to clear obstacle');
  console.log(`PASS: Stuck recovery detected and reversed in ${recoveredInSeconds.toFixed(2)}s, followed by clearance maneuver.`);
}

// 2. SMOKE & SIGHT LOSS TEST: No blind fire, cautious search
function testSmokeConcealment() {
  const ai = new EasyDuelAI();
  const self = createActor(0, 0);
  const target = createActor(0, 40);

  // Sighting target
  ai.update(self, target, true, 0.01);
  ai.update(self, target, true, 1.0);
  assert.equal(ai.canShoot, true, 'Clear line of sight allows firing after reaction delay');

  // Smoke deployed: line of sight immediately cut
  const smokeDecision = ai.update(self, target, false, 0.01);
  assert.equal(smokeDecision.target, undefined, 'Must not aim into smoke');
  assert.equal(ai.canShoot, false, 'Must not shoot into smoke');

  // Cautious advance: AI approaches last known position at cautious speed, not full speed
  let reachedInvestigation = false;
  for (let frame = 0; frame < 300; frame++) {
    const dec = ai.update(self, target, false, 0.1);
    assert.equal(dec.target, undefined, 'Target remains hidden');
    assert.equal(ai.canShoot, false, 'Cannot shoot while hidden');
    // Simulate advancing towards last seen (0, 40)
    self.vehicle.node.position.z = Math.min(35, self.vehicle.node.position.z + 0.3);
    if (self.vehicle.node.position.z >= 33) {
      // Within 8m of last seen (40m)
      if (dec.drive.brake === 1 && dec.drive.throttle === 0) {
        reachedInvestigation = true;
        break;
      }
    }
  }
  assert.ok(reachedInvestigation, 'AI halts to cautiously investigate last seen position in smoke');
  console.log('PASS: Smoke concealment prevents blind fire and enables cautious last-seen investigation.');
}

// 3. AI SEPARATION TEST: Two AI scouts maintain distance and do not overlap
function testAllySeparation() {
  const aiA = new EasyDuelAI();
  const aiB = new EasyDuelAI();
  const scoutA = createActor(0, 10);
  const scoutB = createActor(2, 8); // Very close to scout A (hypot = 2.8m, well within 14m)
  const player = createActor(0, 50);

  const dt = 1 / 60;
  const decA = aiA.update(scoutA, player, true, dt, undefined, { allies: [scoutB] });
  const decB = aiB.update(scoutB, player, true, dt, undefined, { allies: [scoutA] });

  // Both should steer away from each other or brake
  assert.ok(
    decA.drive.steer !== 0 || decB.drive.steer !== 0,
    'AI tanks must apply separation steering when close to allies',
  );

  // Trailing tank should brake or yield if directly behind
  const behindScout = createActor(0, 5); // directly behind scoutA (0, 10)
  const decBehind = new EasyDuelAI().update(behindScout, player, true, dt, undefined, { allies: [scoutA] });
  assert.equal(decBehind.drive.throttle, 0, 'Trailing ally yields throttle when behind lead tank');
  assert.equal(decBehind.drive.brake, 1, 'Trailing ally applies brake when close ahead');

  console.log('PASS: Two AI scouts maintain separation distance and avoid stacking/ramming.');
}

// 4. FAIRNESS & REACTION & GRACE PERIOD TEST:
function testFairnessAndGrace() {
  const ai = new EasyDuelAI();
  const self = createActor(0, 0);
  const target = createActor(0, 40);

  // Initial sighting: reaction delay gate
  assert.equal(ai.canShoot, false, 'Initially cannot shoot');
  ai.update(self, target, true, 0.05);
  assert.equal(ai.canShoot, false, 'Visible reaction delay before first shot');
  ai.update(self, target, true, EASY_AI_CONFIG.fairness.reactionDelay);
  assert.equal(ai.canShoot, true, 'Can shoot once reaction delay has elapsed');

  // Ambush 2-second grace period:
  ai.reset();
  ai.setInitialDelay(EASY_AI_CONFIG.fairness.ambushGracePeriod); // 2.0s
  for (let t = 0; t < 1.9; t += 0.2) {
    ai.update(self, target, true, 0.2);
    assert.equal(ai.canShoot, false, `Must not shoot during 2s ambush grace period (at ${t.toFixed(1)}s)`);
  }
  ai.update(self, target, true, 0.3);
  assert.equal(ai.canShoot, true, 'Can shoot after ambush grace period expires');

  console.log('PASS: Reaction delay and 2.0s ambush grace period properly enforced.');
}

// 5. AIM DISPERSION TEST: Dispersion scales with distance and target speed
function testAimDispersion() {
  const ai = new EasyDuelAI();
  const self = createActor(0, 0);

  // Case A: Near & stationary target
  const nearStationary = createActor(0, 15);
  const decisionNear = ai.update(self, nearStationary, true, 0.1);
  assert.ok(decisionNear.target, 'Has target point');
  const spreadNear = Vector3.Distance(decisionNear.target!, new Vector3(0, 1.15, 15));

  // Case B: Far & fast moving target
  const farMoving = createActor(0, 80);
  const decisionFar = ai.update(self, farMoving, true, 0.1, undefined, {
    playerVelocity: new Vector3(10, 0, 0),
  });
  assert.ok(decisionFar.target, 'Has target point');
  const spreadFar = Vector3.Distance(decisionFar.target!, new Vector3(0, 1.15, 80));

  assert.ok(
    spreadFar > spreadNear * 2,
    `Far/moving dispersion (${spreadFar.toFixed(2)}m) must be significantly larger than near/stationary (${spreadNear.toFixed(2)}m)`,
  );
  console.log(`PASS: Aim dispersion scales dynamically (near: ${spreadNear.toFixed(2)}m, far/moving: ${spreadFar.toFixed(2)}m).`);
}

// 6. DAMAGE REACTION TEST: Retreats on taking damage
function testDamageReaction() {
  const ai = new EasyDuelAI();
  const self = createActor(0, 0);
  const target = createActor(0, 40);

  ai.update(self, target, true, 0.1);
  ai.onDamage(new Vector3(0, 0, 40));

  const decision = ai.update(self, target, true, 0.1);
  assert.ok(decision.drive.throttle < 0, 'Must reverse when taking damage');
  assert.notEqual(decision.drive.steer, 0, 'Must angle hull/steer while falling back');

  console.log('PASS: Damage reaction triggers defensive reverse and hull angulation.');
}

testStuckRecovery();
testSmokeConcealment();
testAllySeparation();
testFairnessAndGrace();
testAimDispersion();
testDamageReaction();

console.log('ALL EASY DUEL AI TESTS PASSED.');
