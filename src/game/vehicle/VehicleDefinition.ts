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
}
export const IRON_DUST_01: Readonly<VehicleDefinition> = Object.freeze({
  mass: 42000, forwardSpeed: 48 / 3.6, reverseSpeed: 18 / 3.6,
  power: 850000, traction: 180000, brakeForce: 380000,
  grip: 1.25, lateralResponse: 4, rollingResistance: 0.025,
  suspensionTravel: 0.45, staticCompression: 0.22, dampingRatio: 0.7,
  reverseDelay: 0.25,
});
