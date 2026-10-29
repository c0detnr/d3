import { Matrix, Vector3 } from '@babylonjs/core';
import type { DuelTank } from './DuelTank.ts';
import type { DriveCommand } from '../input/DriveInput.ts';
import { wrapAngle } from '../vehicle/TurretController.ts';

/** Deterministic, forgiving AI; perception is supplied by the world, never guessed here. */
export class EasyDuelAI {
  private lastSeen?: Vector3;
  private unseenFor = 0;
  private reaction = 0;
  private reloadPause = 0;
  private wasVisible = false;
  private trackedVehicle?: DuelTank['vehicle'];
  private previousPosition?: Vector3;
  private stuckFor = 0;
  private recovery = 0;
  private recoverySide = 1;
  get canShoot() { return this.wasVisible && this.reaction <= 0 && this.reloadPause <= 0; }

  update(opponent: Pick<DuelTank, 'vehicle'>, player: Pick<DuelTank, 'vehicle'>, visible: boolean, dt: number, destination?: Vector3): { drive: DriveCommand; target?: Vector3 } {
    this.reaction = Math.max(0, this.reaction - dt);
    this.reloadPause = Math.max(0, this.reloadPause - dt);
    if (visible && (!this.wasVisible || this.trackedVehicle !== player.vehicle)) this.reaction = 0.85;
    this.wasVisible = visible;
    this.trackedVehicle = player.vehicle;
    if (visible) { this.lastSeen = player.vehicle.node.position.clone(); this.unseenFor = 0; }
    else this.unseenFor += dt;
    const target = (this.unseenFor <= 4 ? this.lastSeen : undefined)?.clone() ?? destination?.clone();
    const position = opponent.vehicle.node.position;
    const moved = this.previousPosition ? Vector3.Distance(position, this.previousPosition) : Infinity;
    this.previousPosition = position.clone();
    if (!target) {
      this.stuckFor = this.recovery = 0;
      return { drive: { throttle: 0, steer: 0, brake: 1 } };
    }

    const offset = target.subtract(position);
    const distance = Math.hypot(offset.x, offset.z);
    const matrix = Matrix.Compose(Vector3.One(), opponent.vehicle.node.rotationQuaternion!, Vector3.Zero());
    const forward = Vector3.TransformNormal(Vector3.Forward(), matrix).normalize();
    const error = wrapAngle(Math.atan2(offset.x, offset.z) - Math.atan2(forward.x, forward.z));
    const steer = Math.abs(error) < 0.08 ? 0 : Math.max(-1, Math.min(1, error * 1.5));
    // Hold an engagement distance instead of driving into the target's hull.
    let drive: DriveCommand = visible && distance >= 30 && distance <= 55
      ? { throttle: 0, steer: 0, brake: 1 }
      : visible && distance < 30
        ? { throttle: -0.4, steer: -steer, brake: 0 }
        : distance < 8 ? { throttle: 0, steer: 0, brake: 1 }
          : { throttle: Math.abs(error) > 1.1 ? 0 : 0.65, steer, brake: 0 };
    const speed = Math.abs(opponent.vehicle.speed ?? 0);
    const desiredSpeed = destination && !visible ? Math.min(8, Math.max(2, distance * .35)) : 12;
    // Slow before a bend; coasting at full speed made route corners overshoot narrow gates.
    if ((Math.abs(error) > .6 && speed > 3) || (drive.throttle > 0 && speed > desiredSpeed)) {
      drive = { throttle: 0, steer, brake: 1 };
    }
    if (this.recovery > 0) {
      this.recovery = Math.max(0, this.recovery - dt);
      drive = { throttle: -0.55, steer: this.recoverySide * 0.8, brake: 0 };
    } else {
      this.stuckFor = Math.abs(drive.throttle) > 0.2 && moved < dt * 0.25 ? this.stuckFor + dt : 0;
      if (this.stuckFor >= 2) {
        this.stuckFor = 0; this.recovery = 1.4; this.recoverySide *= -1;
        drive = { throttle: -0.55, steer: this.recoverySide * 0.8, brake: 0 };
      }
    }
    return { drive, target: visible ? target.add(new Vector3(0, 1.15, 0)) : undefined };
  }

  shotFired() { this.reloadPause = 4.5; }
  reset() {
    this.lastSeen = this.previousPosition = undefined; this.trackedVehicle = undefined;
    this.unseenFor = this.reaction = this.reloadPause = this.stuckFor = this.recovery = 0;
    this.wasVisible = false; this.recoverySide = 1;
  }
}
