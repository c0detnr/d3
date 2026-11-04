import { FreeCamera, Vector3, type Scene, type TransformNode } from '@babylonjs/core';

export type ShotName = 'chase' | 'low' | 'side' | 'front' | 'orbit' | 'drone' | 'barrel'
  | 'flyby' | 'vertigo' | 'track' | 'crane' | 'topdown' | 'muzzle' | 'game';

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
  flyby: { label: 'Geçiş', key: 'Y', fov: 0.6, follow: 0, aim: 7 },
  vertigo: { label: 'Vertigo', key: 'U', fov: 1.2, follow: 0, aim: 10 },
  track: { label: 'Palet', key: 'I', fov: 1.1, follow: 6, aim: 8 },
  crane: { label: 'Vinç', key: 'O', fov: 0.85, follow: 2, aim: 4 },
  topdown: { label: 'Kuşbakışı', key: 'P', fov: 0.75, follow: 1.5, aim: 3 },
  muzzle: { label: 'Karşı namlu', key: 'L', fov: 0.8, follow: 0, aim: 0 },
  game: { label: 'Oyun', key: 'C', fov: 0.8, follow: 0, aim: 0 },
};
const CENTER_HEIGHT = 1.3, GROUND_CLEARANCE = 0.3, ORBIT_RADIUS = 11, ORBIT_RATE = 0.22;
/** Flyby: camera is planted this far ahead/aside and re-planted once the tank is this far past. */
const FLYBY_AHEAD = 24, FLYBY_SIDE = 5, FLYBY_HEIGHT = 2.2, FLYBY_PAST = 16, FLYBY_MAX = 70, FLYBY_SIGHT_CLEARANCE = 0.6;
/** Vertigo: dolly from near to far over the period while the lens keeps the subject the same height. */
const VERTIGO_NEAR = 6, VERTIGO_FAR = 24, VERTIGO_PERIOD = 6, VERTIGO_FRAME = 8;
/** Crane: rises from low behind to high over the period, then holds. */
const CRANE_PERIOD = 8;
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

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
  private flybySide = 1;
  private readonly flybyPoint = new Vector3();
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
    let lens = this.fov; // user lens; vertigo derives its own each frame from it
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
      case 'flyby': {
        const offset = center.subtract(this.flybyPoint);
        if (!this.snapped || Vector3.Dot(offset, forward) > FLYBY_PAST || offset.length() > FLYBY_MAX) {
          this.flybySide = -this.flybySide; this.snapped = false;
          this.flybyPoint.copyFrom(center.add(forward.scale(FLYBY_AHEAD)).add(right.scale(FLYBY_SIDE * this.flybySide)));
          let y = this.ground(this.flybyPoint.x, this.flybyPoint.z) + FLYBY_HEIGHT;
          // Lift the camera until the sight line to the tank clears the terrain between them.
          for (const f of [0.25, 0.5, 0.75]) {
            const x = this.flybyPoint.x + (center.x - this.flybyPoint.x) * f, z = this.flybyPoint.z + (center.z - this.flybyPoint.z) * f;
            y = Math.max(y, (this.ground(x, z) + FLYBY_SIGHT_CLEARANCE - center.y * f) / (1 - f));
          }
          this.flybyPoint.y = y;
        }
        eye = this.flybyPoint.clone(); look = center; break;
      }
      case 'vertigo': {
        // Triangle wave so the push/pull loops; fov solves for a constant framed height at the subject.
        const phase = (this.time / VERTIGO_PERIOD) % 2, k = smooth(phase < 1 ? phase : 2 - phase);
        const distance = VERTIGO_NEAR + (VERTIGO_FAR - VERTIGO_NEAR) * k;
        lens = 2 * Math.atan(VERTIGO_FRAME / (2 * distance)) * (this.fov / preset.fov);
        const dir = forward.scale(0.8).add(right.scale(0.6)).normalize();
        eye = center.add(dir.scale(distance)).add(up.scale(-0.3)); look = center; break;
      }
      case 'track': eye = center.add(right.scale(3)).add(forward.scale(4.5)).add(up.scale(0.45 - CENTER_HEIGHT));
        look = center.add(right.scale(1.5)).add(forward.scale(-4)).add(up.scale(-0.5)); break;
      case 'crane': {
        const k = smooth(this.time / CRANE_PERIOD);
        eye = center.add(forward.scale(-6 - 8 * k)).add(right.scale(3 - 1.5 * k)).add(up.scale(-0.9 + 13 * k));
        look = center.add(forward.scale(1 + 2 * k)); break;
      }
      case 'topdown': eye = center.add(forward.scale(-1.5)).add(up.scale(26)); look = center.add(forward.scale(1)); break;
      case 'muzzle': {
        const pivot = this.target.pitchPivot.getAbsolutePosition();
        const muzzle = this.target.muzzle.getAbsolutePosition();
        const barrel = muzzle.subtract(pivot).normalize();
        const side = Vector3.Cross(up, barrel).normalize();
        eye = muzzle.add(barrel.scale(4.5)).add(up.scale(0.35)).add(side.scale(0.5)); look = pivot.add(up.scale(0.2)); break;
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
    this.camera.fov = lens;
  }

  dispose() { this.camera.dispose(); }
}
