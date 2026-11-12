import { Matrix, Vector3 } from '@babylonjs/core';
import type { DuelTank } from './DuelTank.ts';
import type { DriveCommand } from '../input/DriveInput.ts';
import { wrapAngle } from '../vehicle/TurretController.ts';
import { EASY_AI_CONFIG, type EasyAIConfig } from './easyAIConfig.ts';

export interface AIContext {
  allies?: Array<Pick<DuelTank, 'vehicle'>>;
  playerVelocity?: Vector3;
}

/** Deterministic, forgiving AI; perception is supplied by the world, never guessed here. */
export class EasyDuelAI {
  readonly config: EasyAIConfig;
  private lastSeen?: Vector3;
  private unseenFor = 0;
  private reaction = 0;
  private reloadPause = 0;
  private gracePeriod = 0;
  private retreatTimer = 0;
  private retreatSide = 1;
  private wasVisible = false;
  private trackedVehicle?: DuelTank['vehicle'];
  private previousPosition?: Vector3;
  private stuckFor = 0;
  private recoveryTimer = 0;
  private recoveryPhase: 'none' | 'reverse' | 'turn' = 'none';
  private recoverySide = 1;
  private combatTimer = 0;
  private timeAlive = 0;
  private shotCount = 0;

  constructor(config: Partial<EasyAIConfig> = {}) {
    this.config = {
      ...EASY_AI_CONFIG,
      ...config,
      engagement: { ...EASY_AI_CONFIG.engagement, ...config.engagement },
      spacing: { ...EASY_AI_CONFIG.spacing, ...config.spacing },
      stuck: { ...EASY_AI_CONFIG.stuck, ...config.stuck },
      movement: { ...EASY_AI_CONFIG.movement, ...config.movement },
      damageReaction: { ...EASY_AI_CONFIG.damageReaction, ...config.damageReaction },
      fairness: {
        ...EASY_AI_CONFIG.fairness,
        ...config.fairness,
        aimDispersion: { ...EASY_AI_CONFIG.fairness.aimDispersion, ...config.fairness?.aimDispersion },
      },
    };
  }

  get canShoot() {
    return this.wasVisible && this.reaction <= 0 && this.reloadPause <= 0 && this.gracePeriod <= 0;
  }

  setInitialDelay(seconds: number) {
    this.gracePeriod = Math.max(this.gracePeriod, seconds);
  }

  onDamage(_hitPoint?: Vector3) {
    this.retreatTimer = this.config.damageReaction.duration;
    this.retreatSide = this.retreatSide === 1 ? -1 : 1;
  }

  update(
    opponent: Pick<DuelTank, 'vehicle'>,
    player: Pick<DuelTank, 'vehicle'>,
    visible: boolean,
    dt: number,
    destination?: Vector3,
    context?: AIContext,
  ): { drive: DriveCommand; target?: Vector3 } {
    this.timeAlive += dt;
    this.reaction = Math.max(0, this.reaction - dt);
    this.reloadPause = Math.max(0, this.reloadPause - dt);
    this.gracePeriod = Math.max(0, this.gracePeriod - dt);
    this.retreatTimer = Math.max(0, this.retreatTimer - dt);

    if (visible && (!this.wasVisible || this.trackedVehicle !== player.vehicle)) {
      this.reaction = this.config.fairness.reactionDelay;
    }
    this.wasVisible = visible;
    this.trackedVehicle = player.vehicle;

    if (visible) {
      this.lastSeen = player.vehicle.node.position.clone();
      this.unseenFor = 0;
    } else {
      this.unseenFor += dt;
    }

    const target = (this.unseenFor <= 4 ? this.lastSeen : undefined)?.clone() ?? destination?.clone();
    const position = opponent.vehicle.node.position;
    const moved = this.previousPosition ? Vector3.Distance(position, this.previousPosition) : Infinity;
    this.previousPosition = position.clone();

    if (!target) {
      this.stuckFor = this.recoveryTimer = 0;
      this.recoveryPhase = 'none';
      return { drive: { throttle: 0, steer: 0, brake: 1 } };
    }

    const offset = target.subtract(position);
    const distance = Math.hypot(offset.x, offset.z);
    const matrix = Matrix.Compose(Vector3.One(), opponent.vehicle.node.rotationQuaternion!, Vector3.Zero());
    const forward = Vector3.TransformNormal(Vector3.Forward(), matrix).normalize();
    const error = wrapAngle(Math.atan2(offset.x, offset.z) - Math.atan2(forward.x, forward.z));
    const steer = Math.abs(error) < 0.08 ? 0 : Math.max(-1, Math.min(1, error * 1.5));

    let drive: DriveCommand;
    if (visible && distance >= this.config.engagement.min && distance <= this.config.engagement.max) {
      // Reposition and stop-and-shoot cycle at engagement distance
      this.combatTimer += dt;
      const cycleDuration = this.config.movement.repositionDuration + this.config.movement.stopToShootDuration;
      const cycleTime = this.combatTimer % cycleDuration;
      if (cycleTime < this.config.movement.stopToShootDuration) {
        // Halted to aim and fire steadily
        drive = { throttle: 0, steer: 0, brake: 1 };
      } else {
        // Repositioning to next vantage with tactical zigzag
        const zigzag = Math.sin(this.timeAlive * (Math.PI * 2 / this.config.movement.zigzagInterval)) * this.config.movement.zigzagAmplitude;
        drive = { throttle: 0.55, steer: Math.max(-1, Math.min(1, steer + zigzag)), brake: 0 };
      }
    } else if (visible && distance < this.config.engagement.min) {
      drive = { throttle: -0.4, steer: -steer, brake: 0 };
    } else if (distance < 8) {
      drive = { throttle: 0, steer: 0, brake: 1 };
    } else {
      const zigzag = visible ? Math.sin(this.timeAlive * (Math.PI * 2 / this.config.movement.zigzagInterval)) * (this.config.movement.zigzagAmplitude * 0.7) : 0;
      drive = { throttle: Math.abs(error) > 1.1 ? 0 : 0.65, steer: Math.max(-1, Math.min(1, steer + zigzag)), brake: 0 };
    }

    const speed = Math.abs(opponent.vehicle.speed ?? 0);
    const desiredSpeed = !visible
      ? (this.lastSeen && this.unseenFor <= 4 ? this.config.movement.cautiousSpeed : (destination ? Math.min(8, Math.max(2, distance * 0.35)) : 12))
      : 12;

    if ((Math.abs(error) > 0.6 && speed > 3) || (drive.throttle > 0 && speed > desiredSpeed)) {
      drive = { throttle: 0, steer: drive.steer, brake: 1 };
    }

    // Ally separation: avoid stacking or colliding with teammate AI tanks
    if (context?.allies && context.allies.length > 0) {
      for (const ally of context.allies) {
        const allyPos = ally.vehicle.node.position;
        const toAlly = allyPos.subtract(position);
        const distToAlly = Math.hypot(toAlly.x, toAlly.z);
        if (distToAlly > 0.05 && distToAlly < this.config.spacing.separationDistance) {
          const allyBearing = Math.atan2(toAlly.x, toAlly.z);
          const headingBearing = Math.atan2(forward.x, forward.z);
          const relAngle = wrapAngle(allyBearing - headingBearing);
          if (Math.abs(relAngle) < Math.PI * 0.6) {
            const avoidSteer = relAngle > 0 ? -0.8 : 0.8;
            drive.steer = Math.max(-1, Math.min(1, drive.steer + avoidSteer));
            if (distToAlly < 10 && Math.abs(relAngle) < 0.8 && drive.throttle > 0) {
              drive = { throttle: 0, steer: drive.steer, brake: 1 };
            }
          }
        }
      }
    }

    // Damage retreat behavior: brief defensive fallback / hull angulation
    if (this.retreatTimer > 0) {
      drive = {
        throttle: this.config.damageReaction.reverseThrottle,
        steer: this.retreatSide * 0.65,
        brake: 0,
      };
    }

    // Stuck recovery: 2-phase recovery (reverse-and-turn, then forward maneuver clear)
    if (this.recoveryTimer > 0) {
      this.recoveryTimer = Math.max(0, this.recoveryTimer - dt);
      if (this.recoveryPhase === 'reverse') {
        drive = { throttle: this.config.stuck.reverseThrottle, steer: this.recoverySide * 0.85, brake: 0 };
        if (this.recoveryTimer <= 0) {
          this.recoveryPhase = 'turn';
          this.recoveryTimer = this.config.stuck.turnTime;
        }
      } else if (this.recoveryPhase === 'turn') {
        drive = { throttle: 0.6, steer: -this.recoverySide * 0.75, brake: 0 };
        if (this.recoveryTimer <= 0) {
          this.recoveryPhase = 'none';
        }
      }
    } else {
      this.stuckFor = Math.abs(drive.throttle) > 0.2 && moved < dt * this.config.stuck.speedThreshold ? this.stuckFor + dt : 0;
      if (this.stuckFor >= this.config.stuck.detectTime) {
        this.stuckFor = 0;
        this.recoveryPhase = 'reverse';
        this.recoveryTimer = this.config.stuck.reverseTime;
        this.recoverySide *= -1;
        drive = { throttle: this.config.stuck.reverseThrottle, steer: this.recoverySide * 0.85, brake: 0 };
      }
    }

    // Fairness & Aim dispersion: calculate aim with distance and target speed dispersion
    let targetAim: Vector3 | undefined;
    if (visible) {
      const baseAim = target.add(new Vector3(0, 1.15, 0));
      let targetSpeed = 0;
      if (context?.playerVelocity) {
        targetSpeed = Math.hypot(context.playerVelocity.x, context.playerVelocity.z);
      } else {
        targetSpeed = Math.abs((player.vehicle as any).speed ?? 0);
      }
      const distSpread = distance * this.config.fairness.aimDispersion.distanceFactor;
      const speedSpread = targetSpeed * this.config.fairness.aimDispersion.speedFactor;
      const spreadRadius = this.config.fairness.aimDispersion.base + distSpread + speedSpread;
      const dispersionAngle = this.shotCount * 2.3999 + this.timeAlive * 0.75;
      const spreadOffset = new Vector3(
        Math.cos(dispersionAngle) * spreadRadius,
        Math.sin(dispersionAngle * 1.5) * (spreadRadius * 0.35),
        Math.sin(dispersionAngle) * spreadRadius,
      );
      targetAim = baseAim.add(spreadOffset);
    }

    return { drive, target: targetAim };
  }

  shotFired() {
    this.reloadPause = this.config.fairness.reloadTime;
    this.shotCount++;
  }

  reset() {
    this.lastSeen = this.previousPosition = undefined;
    this.trackedVehicle = undefined;
    this.unseenFor = this.reaction = this.reloadPause = this.stuckFor = this.recoveryTimer = 0;
    this.recoveryPhase = 'none';
    this.retreatTimer = 0;
    this.gracePeriod = 0;
    this.combatTimer = 0;
    this.timeAlive = 0;
    this.shotCount = 0;
    this.wasVisible = false;
    this.recoverySide = 1;
  }
}
