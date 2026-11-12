/** Gameplay tuning, SI units (m, s, kg, N, W, radians); not a real tank specification. */
export interface VehicleDefinition {
  mass: number;
  forwardSpeed: number;
  reverseSpeed: number;
  power: number;
  traction: number;
  brakeForce: number;
  grip: number;
  lateralResponse: number;
  rollingResistance: number;
  suspensionTravel: number;
  staticCompression: number;
  dampingRatio: number;
  reverseDelay: number;
  turretYawSpeed: number;
  gunPitchSpeed: number;
  turretResponseTime: number;
  gunResponseTime: number;
  gunMinElevation: number;
  gunMaxElevation: number;
  /** Roof-mounted drone jammer field radius, metres (20 m diameter). */
  jammerRadius: number;
}
export const IRON_DUST_01: Readonly<VehicleDefinition> = Object.freeze({
  mass: 42000, forwardSpeed: 48 / 3.6, reverseSpeed: 18 / 3.6,
  power: 850000, traction: 180000, brakeForce: 380000,
  grip: 1.25, lateralResponse: 4, rollingResistance: 0.025,
  suspensionTravel: 0.45, staticCompression: 0.22, dampingRatio: 0.7,
  reverseDelay: 0.25,
  turretYawSpeed: 35 * Math.PI / 180, gunPitchSpeed: 15 * Math.PI / 180,
  turretResponseTime: 0.08, gunResponseTime: 0.10, // seconds
  gunMinElevation: -8 * Math.PI / 180, gunMaxElevation: 20 * Math.PI / 180,
  jammerRadius: 10,
});
