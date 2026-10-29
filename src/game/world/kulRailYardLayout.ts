/** Metres. The yard sits beyond the east route; z=0 stays open across all three sidings. */
export const KUL_RAIL_YARD = { x: 294, z: 0, width: 100, depth: 160, height: -4, apron: 14 };
export const KUL_RAIL_TRACKS = [260, 284, 308];
export const KUL_RAIL_WAGONS = [
  { x: 260, z: -57, yaw: 0, open: false },
  { x: 260, z: -33, yaw: 0, open: true },
  { x: 260, z: 36, yaw: 0, open: false },
  { x: 284, z: -49, yaw: 0, open: true },
  { x: 284, z: 42, yaw: 0, open: false },
  { x: 308, z: -60, yaw: 0, open: false },
  { x: 308, z: 26, yaw: 0.19, open: true },
];
export const KUL_RAIL_DEPOT = { x: 330, z: -27, width: 14, depth: 22, height: 6 };
export const KUL_RAIL_CRANE = { x: 328, z: 52 };

export function inKulRailYard(x: number, z: number, margin = 0) {
  const p = KUL_RAIL_YARD;
  return Math.abs(x - p.x) < p.width / 2 + margin && Math.abs(z - p.z) < p.depth / 2 + margin;
}
