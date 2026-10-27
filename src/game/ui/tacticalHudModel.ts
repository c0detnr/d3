/** World +Z is north; angles are radians, speed is signed metres/second. */
export function headingDegrees(yaw: number) {
  return ((yaw * 180 / Math.PI) % 360 + 360) % 360;
}

export function headingLabel(yaw: number) {
  return String(Math.round(headingDegrees(yaw)) % 360).padStart(3, '0');
}

export function speedLabel(metresPerSecond: number) {
  return String(Math.round(Math.abs(metresPerSecond) * 3.6));
}
