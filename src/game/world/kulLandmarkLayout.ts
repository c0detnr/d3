/**
 * Metres. Point-symmetric central landmarks; both teams get the same cover.
 * Positions keep the centre road, the x = ±35 m field crossings and existing cover clear.
 */
export const KUL_FIELD_LANDMARKS = [
  { id: 'field-ruin-A', kind: 'ruin', x: -55, z: -8, width: 12, depth: 9, yaw: 0 },
  { id: 'field-ruin-B', kind: 'ruin', x: 55, z: 8, width: 12, depth: 9, yaw: Math.PI },
  { id: 'field-wreck-A', kind: 'wreck', x: 60, z: -165, width: 8, depth: 4, yaw: 0.6 },
  { id: 'field-wreck-B', kind: 'wreck', x: -60, z: 165, width: 8, depth: 4, yaw: 0.6 + Math.PI },
] as const;

/** Keep other props and craters outside these circles. */
export const KUL_LANDMARK_CLEARANCE = { ruin: 14, wreck: 12 } as const;

/** Tank field-crossing lines driven by the map check (x, from z=-150 to z=150). */
export const KUL_FIELD_CROSSINGS = [-35, 35] as const;
