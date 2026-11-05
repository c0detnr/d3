import type { MissionDefinition } from './MissionDirector.ts';
import { pathCenter } from '../world/terrain.ts';
export const ROOKIE_DAY: MissionDefinition = {
  id: 'rookie', timeTarget: 360, damageTarget: 50,
  steps: [
    { id: 'drive', kind: 'checkpoint', count: 3, targets: ['cp1', 'cp2', 'cp3'], ordered: true },
    { id: 'range', kind: 'hit', count: 3, targets: ['target1', 'target2', 'target3'] },
    { id: 'ambush', kind: 'destroy', count: 2, targets: ['scout1', 'scout2'] },
  ],
};
// Follow the existing clear trail, ending before the first armour target.
export const ROOKIE_CHECKPOINTS = [-22, -4, 12].map((z, i) => ({ id: `cp${i + 1}`, x: pathCenter(z), z, radius: 6 }));
export const ROOKIE_SCOUTS = [{ id: 'scout1' }, { id: 'scout2' }];

// These clear trail sections avoid the fixed targets at z=20/60/110 and forest trunks.
export const ROOKIE_AMBUSH_Z = [-15, 38, 83];
