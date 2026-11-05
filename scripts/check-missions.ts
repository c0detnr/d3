import assert from 'node:assert/strict';
import { MissionDirector, type MissionScore } from '../src/game/mission/MissionDirector.ts';
import { ROOKIE_DAY } from '../src/game/mission/rookieDay.ts';
import { isMissionUnlocked } from '../src/game/core/missions.ts';
import { defaults, readSave, writeSave } from '../src/game/core/playerSave.ts';
import { useShellStore } from '../src/game/core/shellStore.ts';
const mission = new MissionDirector(ROOKIE_DAY);
const completed: string[] = [], results: MissionScore[] = [];
mission.onStep = step => completed.push(step.id); mission.onFinish = score => results.push(score);
mission.dispatch({ type: 'checkpoint', id: 'cp1' }); mission.update(100);
assert.equal(mission.state, 'briefing'); assert.equal(mission.seconds, 0); assert.equal(mission.progress, 0);
mission.start(); mission.start(); mission.update(42);
mission.dispatch({ type: 'checkpoint', id: 'cp2' }); assert.equal(mission.progress, 0, 'ordered checkpoints');
for (const id of ['cp1', 'cp1', 'cp2', 'cp3']) mission.dispatch({ type: 'checkpoint', id });
assert.equal(mission.step.id, 'range');
mission.dispatch({ type: 'destroy', id: 'scout1' }); assert.equal(mission.progress, 0, 'future-step events ignored');
for (const id of ['target2', 'target2', 'target1']) { mission.dispatch({ type: 'shot' }); mission.dispatch({ type: 'hit', id }); }
assert.equal(mission.progress, 2, 'distinct targets only');
mission.dispatch({ type: 'shot' }); mission.dispatch({ type: 'hit', id: 'target3' });
assert.equal(mission.step.id, 'ambush');
mission.dispatch({ type: 'damage', amount: 25 }); mission.dispatch({ type: 'damage', amount: -100 });
for (const id of ['scout2', 'scout2', 'unknown', 'scout1']) mission.dispatch({ type: 'destroy', id });
assert.equal(mission.state, 'victory'); assert.deepEqual(completed, ['drive', 'range', 'ambush']); assert.equal(results.length, 1);
assert.equal(results[0].stars, 3); assert.equal(results[0].damageTaken, 25); assert.equal(results[0].hits, 4);
mission.dispatch({ type: 'playerDestroyed' }); mission.update(100); assert.equal(mission.state, 'victory'); assert.equal(mission.seconds, 42);
const failed = new MissionDirector(ROOKIE_DAY); failed.start(); failed.dispatch({ type: 'playerDestroyed' });
failed.dispatch({ type: 'checkpoint', id: 'cp1' }); assert.equal(failed.state, 'defeat'); assert.equal(failed.progress, 0); assert.equal(failed.score().stars, 0);
const timed = new MissionDirector({ id: 'future', timeTarget: 360, damageTarget: 50, steps: [{ id: 'hold', kind: 'duration', count: 5 }] });
timed.start(); timed.update(4); assert.equal(timed.state, 'active'); timed.update(1); assert.equal(timed.state, 'victory');
for (const [seconds, damage, stars] of [[359.9, 49, 3], [360, 49, 2], [359, 50, 2], [360, 50, 1]]) {
  const m = new MissionDirector({ ...ROOKIE_DAY, steps: [{ id: 'kill', kind: 'destroy', count: 1 }] });
  m.start(); m.update(seconds); m.dispatch({ type: 'damage', amount: damage }); m.dispatch({ type: 'destroy', id: 'x' }); assert.equal(m.score().stars, stars);
}
assert.equal(isMissionUnlocked('supplies', {}), false);
useShellStore.getState().finishMission(results[0]);
assert.equal(isMissionUnlocked('supplies', useShellStore.getState().progress), true);
assert.equal(isMissionUnlocked('bridge', useShellStore.getState().progress), false);
const save = defaults(); save.missions = useShellStore.getState().progress;
let stored = ''; writeSave(save, { setItem: (_, value) => { stored = value; } });
assert.deepEqual(readSave({ getItem: () => stored }).missions.rookie.stats, { seconds: 42, shots: 4, hits: 4, damageTaken: 25 });
for (let i = 0; i < 5; i++) { const fresh = new MissionDirector(ROOKIE_DAY); fresh.start(); assert.equal(fresh.seconds, 0); assert.equal(fresh.progress, 0); }
console.log('MISSIONS PASS: briefing, ordered/distinct events, staged objectives, terminal lock, defeat, duration, star boundaries, persistence/unlock, five fresh starts');
