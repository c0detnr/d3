import { Matrix, Vector3 } from '@babylonjs/core';
import type { DuelTank } from './DuelTank.ts';
import type { DriveCommand } from '../input/DriveInput.ts';
import { wrapAngle } from '../vehicle/TurretController.ts';

/** Small deterministic opponent for the local duel. Values favor readable, forgiving combat. */
export class EasyDuelAI {
  private lastSeen?: Vector3;
  private unseenFor = 0;
  private reaction = 0;
  private reloadPause = 0;
  private wasVisible = false;
  get canShoot() { return this.unseenFor < 0.3 && this.reaction <= 0 && this.reloadPause <= 0; }

  update(opponent: DuelTank, player: Pick<DuelTank, 'vehicle'>, visible: boolean, dt: number): { drive: DriveCommand; target?: Vector3 } {
    if (visible) { this.lastSeen = player.vehicle.node.position.clone(); this.unseenFor = 0; }
    else this.unseenFor += dt;
    this.reaction = Math.max(0, this.reaction - dt);
    this.reloadPause = Math.max(0, this.reloadPause - dt);
    const target = visible ? player.vehicle.node.position.clone() : this.lastSeen?.clone();
    if (!target || this.unseenFor > 4) return { drive: { throttle: 0, steer: 0, brake: 1 } };

    const offset = target.subtract(opponent.vehicle.node.position);
    const distance = offset.length();
    const matrix = Matrix.Compose(Vector3.One(), opponent.vehicle.node.rotationQuaternion!, Vector3.Zero());
    const forward = Vector3.TransformNormal(Vector3.Forward(), matrix).normalize();
    const desired = Math.atan2(offset.x, offset.z);
    const heading = Math.atan2(forward.x, forward.z);
    const error = wrapAngle(desired - heading);
    const steer = Math.abs(error) < 0.12 ? 0 : Math.sign(error);
    const throttle = distance > 22 && Math.abs(error) < 1.65 ? 0.72 : distance < 12 ? 0 : 0.42;
    const drive = distance < 10 ? { throttle: 0, steer: 0, brake: 1 } : { throttle, steer, brake: 0 };
    if (visible && !this.wasVisible) this.reaction = 0.85;
    this.wasVisible = visible;
    return { drive, target: visible ? player.vehicle.node.position.clone().add(new Vector3(0, 1.15, 0)) : undefined };
  }

  shotFired() { this.reloadPause = 4.5; }
  reset() { this.lastSeen = undefined; this.unseenFor = this.reaction = this.reloadPause = 0; this.wasVisible = false; }
}
