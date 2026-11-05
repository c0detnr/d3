import type { TranslationKey } from '../i18n/index.ts';
export interface Mission { id: string; name: TranslationKey; description: TranslationKey; map: TranslationKey; playable: boolean; story?: TranslationKey; objectives: TranslationKey[] }
export const MISSIONS: Mission[] = [
  { id: 'rookie', name: 'rookieName', description: 'rookieShort', map: 'naturalMap', playable: true, story: 'rookieStory', objectives: ['rookieGoal1', 'rookieGoal2', 'rookieGoal3'] },
  { id: 'supplies', name: 'suppliesName', description: 'suppliesShort', map: 'forestMap', playable: false, objectives: ['suppliesGoal'] },
  { id: 'bridge', name: 'bridgeName', description: 'bridgeShort', map: 'bridgeMap', playable: false, objectives: ['bridgeGoal'] },
  { id: 'factory', name: 'factoryName', description: 'factoryShort', map: 'factoryMap', playable: false, objectives: ['factoryGoal'] },
  { id: 'colonel', name: 'colonelName', description: 'colonelShort', map: 'baseMap', playable: false, objectives: ['colonelGoal'] },
];

/** Unlocking is progression; playable remains false for content still coming soon. */
export function isMissionUnlocked(id: string, progress: Record<string, { completed: boolean }>) {
  const index = MISSIONS.findIndex(mission => mission.id === id);
  return index === 0 || (index > 0 && progress[MISSIONS[index - 1].id]?.completed === true);
}
