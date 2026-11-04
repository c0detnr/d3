import { FreeCamera, Vector3, type Scene, type TransformNode } from '@babylonjs/core';

export type ShotName = 'chase' | 'low' | 'side' | 'front' | 'orbit' | 'drone' | 'barrel' | 'game';

/** Distances in metres, fov in radians (vertical), follow/aim are smoothing rates in 1/s (0 = rigid). */
interface ShotPreset { label: string; key: string; fov: number; follow: number; aim: number }
export const SHOTS: Record<ShotName, ShotPreset> = {
  chase: { label: 'Takip', key: '3', fov: 0.9, follow: 3, aim: 6 },
  low: { label: 'Alçak', key: '4', fov: 1.05, follow: 5, aim: 8 },
  side: { label: 'Yan', key: '5', fov: 0.7, follow: 2.5, aim: 8 },
  front: { label: 'Ön', key: '6', fov: 0.7, follow: 1.5, aim: 8 },
  orbit: { label: 'Yörünge', key: '7', fov: 0.8, follow: 4, aim: 8 },
  drone: { label: 'Drone', key: '8', fov: 0.85, follow: 1.2, aim: 3 },
  barrel: { label: 'Namlu', key: '9', fov: 0.75, follow: 0, aim: 0 },
  game: { label: 'Oyun', key: 'C', fov: 0.8, follow: 0, aim: 0 },
};
const CENTER_HEIGHT = 1.3, GROUND_CLEARANCE = 0.3, ORBIT_RADIUS = 11, ORBIT_RATE = 0.22;

export interface ShotTarget { hull: TransformNode; pitchPivot: TransformNode; muzzle: TransformNode }

/** Cinematic camera driven only by the dt it is given, so offline renders match live previews. */
export class StudioCamera {
  readonly camera: FreeCamera;
  shot: ShotName = 'chase';
  fov = SHOTS.chase.fov;
  handheld = true;
  private time = 0;
  private snapped = false;
  private orbitStart = 0;
  private readonly eye = new Vector3();
  private readonly look = new Vector3();
  private readonly target: ShotTarget;
  private readonly ground: (x: number, z: number) => number;

  constructor(scene: Scene, target: ShotTarget, ground: (x: number, z: number) => number, maxZ: number) {
    this.target = target; this.ground = ground;
    this.camera = new FreeCamera('studio-camera', Vector3.Zero(), scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.1; this.camera.maxZ = maxZ;
  }

  /** A new shot snaps; reselecting the current shot only changes the lens. */
  select(shot: ShotName, fov = SHOTS[shot].fov) {
    if (shot !== this.shot) { this.shot = shot; this.snapped = false; this.time = 0; }
    this.fov = fov;
  }

  update(dt: number) {
    if (this.shot === 'game') return;
    this.time += dt;
    const preset = SHOTS[this.shot];
    const center = this.target.hull.getAbsolutePosition().add(new Vector3(0, CENTER_HEIGHT, 0));
    const hullForward = this.target.hull.getDirection(Vector3.Forward());
    const forward = new Vector3(hullForward.x, 0, hullForward.z).normalize();
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const up = Vector3.Up();
    let eye: Vector3, look: Vector3;
    switch (this.shot) {
      case 'chase': eye = center.add(forward.scale(-14)).add(up.scale(1.8)); look = center.add(forward.scale(5)); break;
      case 'low': eye = center.add(forward.scale(-6)).add(right.scale(1.6)).add(up.scale(-0.85));
        look = center.add(forward.scale(14)).add(up.scale(0.3)); break;
      case 'side': eye = center.add(right.scale(9)).add(forward.scale(1.5)).add(up.scale(0.1)); look = center; break;
      case 'front': eye = center.add(forward.scale(16)).add(up.scale(-0.4)); look = center; break;
      case 'orbit': {
        if (!this.snapped) this.orbitStart = Math.atan2(-forward.x, -forward.z);
        const angle = this.orbitStart + this.time * ORBIT_RATE;
        eye = center.add(new Vector3(Math.sin(angle) * ORBIT_RADIUS, 1.6, Math.cos(angle) * ORBIT_RADIUS)); look = center; break;
      }
      case 'drone': eye = center.add(forward.scale(-16)).add(up.scale(13)); look = center.add(forward.scale(6)); break;
      case 'barrel': {
        const pivot = this.target.pitchPivot.getAbsolutePosition();
        const barrel = this.target.muzzle.getAbsolutePosition().subtract(pivot).normalize();
        const side = Vector3.Cross(up, barrel).normalize();
        eye = pivot.add(barrel.scale(-2.6)).add(up.scale(1)).add(side.scale(0.75));
        look = pivot.add(barrel.scale(60)).add(up.scale(0.5)); break;
      }
      default: return;
    }
    if (!this.snapped || !preset.follow) this.eye.copyFrom(eye);
    else this.eye.addInPlace(eye.subtract(this.eye).scale(1 - Math.exp(-preset.follow * dt)));
    if (!this.snapped || !preset.aim) this.look.copyFrom(look);
    else this.look.addInPlace(look.subtract(this.look).scale(1 - Math.exp(-preset.aim * dt)));
    this.snapped = true;
    this.eye.y = Math.max(this.eye.y, this.ground(this.eye.x, this.eye.z) + GROUND_CLEARANCE);
    const position = this.eye.clone(), aimAt = this.look.clone();
    if (this.handheld && this.shot !== 'barrel') {
      // Deterministic sway: incommensurate sines read as a hand-held operator.
      const t = this.time;
      position.addInPlace(right.scale((Math.sin(t * 1.3) + 0.6 * Math.sin(t * 2.9 + 1)) * 0.03))
        .addInPlace(up.scale((Math.sin(t * 1.7 + 2) + 0.5 * Math.sin(t * 3.7)) * 0.025));
      aimAt.addInPlace(right.scale(Math.sin(t * 0.9 + 4) * 0.06)).addInPlace(up.scale(Math.sin(t * 1.1 + 3) * 0.04));
    }
    this.camera.position.copyFrom(position);
    this.camera.setTarget(aimAt);
    this.camera.fov = this.fov;
  }

  dispose() { this.camera.dispose(); }
}
