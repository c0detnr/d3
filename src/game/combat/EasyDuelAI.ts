import { Vector3 } from '@babylonjs/core';
import type { DuelTank } from './DuelTank.ts';
import type { DriveCommand } from '../input/DriveInput.ts';
import { wrapAngle } from '../vehicle/TurretController.ts';
import { EASY_AI_CONFIG, AI_DIFFICULTY, AI_TACTICS, type AIDifficulty, type EasyAIConfig } from './easyAIConfig.ts';
import { FILM_NAV, type NavigationAgent } from './FilmNavigation.ts';

export interface AIContext {
  allies?: Array<Pick<DuelTank, 'vehicle'>>;
  playerVelocity?: Vector3;
  navigation?: NavigationAgent;
  health?: number;
  slot?: number;
  /** A delayed, copied observation; never a live reference to an unseen enemy. */
  report?: Vector3;
  sensors?: { front: number; left: number; right: number; rear: number };
}
export type TacticalState = 'advance' | 'contact' | 'cover' | 'reposition' | 'retreat' | 'search';
const clamp = (n: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, n));

/** Fixed-step decision layer. Only the visible branch may read the opponent's pose or velocity. */
export class EasyDuelAI {
  readonly config: EasyAIConfig;
  difficulty: AIDifficulty = 'normal';
  state: TacticalState = 'advance';
  aimSpread = 0;
  private readonly lastSeen = Vector3.Zero();
  private hasMemory = false;
  private unseenFor = 0;
  private reaction = 0;
  private reloadPause = 0;
  private gracePeriod = 0;
  private dangerFor = 0;
  private readonly hitPoint = Vector3.Zero();
  private hitPending = false;
  private hasSuspected = false;
  private readonly suspected = Vector3.Zero();
  private wasVisible = false;
  private trackedVehicle?: DuelTank['vehicle'];
  private readonly previousPosition = Vector3.Zero();
  private hasPrevious = false;
  private stuckFor = 0;
  private recoveryTimer = 0;
  private recoverySide = 1;
  private timeAlive = 0;
  private stateTime = 0;
  private coverRetry = 0;
  private coverPoint?: Vector3;
  private previousCover?: Vector3;
  private replan = 0;
  private settled = 0;
  private sampleIn = 0;
  private errorX = 0;
  private errorY = 0;
  private desiredErrorX = 0;
  private desiredErrorY = 0;
  private randomState: number;
  private readonly seed: number;
  private readonly aim = Vector3.Zero();
  private readonly look = Vector3.Zero();
  private readonly fallback = Vector3.Zero();
  private readonly drive: DriveCommand = { throttle: 0, steer: 0, brake: 1 };
  private readonly result: { drive: DriveCommand; target?: Vector3; look?: Vector3 } = { drive: this.drive };

  constructor(config: Partial<EasyAIConfig> = {}, seed = 51723) {
    this.seed = this.randomState = seed >>> 0 || 1;
    this.config = { ...EASY_AI_CONFIG, ...config,
      engagement: { ...EASY_AI_CONFIG.engagement, ...config.engagement },
      spacing: { ...EASY_AI_CONFIG.spacing, ...config.spacing },
      stuck: { ...EASY_AI_CONFIG.stuck, ...config.stuck },
      movement: { ...EASY_AI_CONFIG.movement, ...config.movement },
      damageReaction: { ...EASY_AI_CONFIG.damageReaction, ...config.damageReaction },
      fairness: { ...EASY_AI_CONFIG.fairness, ...config.fairness,
        aimDispersion: { ...EASY_AI_CONFIG.fairness.aimDispersion, ...config.fairness?.aimDispersion } } };
  }
  private random() {
    let n = this.randomState; n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    this.randomState = n >>> 0; return this.randomState / 4294967296;
  }
  get canShoot() {
    return this.wasVisible && this.reaction <= 0 && this.reloadPause <= 0 && this.gracePeriod <= 0
      && this.state !== 'cover' && this.state !== 'retreat' && this.state !== 'reposition';
  }
  setInitialDelay(seconds: number) { this.gracePeriod = Math.max(this.gracePeriod, seconds); }
  onDamage(hitPoint?: Vector3) {
    this.dangerFor = this.config.damageReaction.duration;
    if (hitPoint) { this.hitPoint.copyFrom(hitPoint); this.hitPending = true; }
    this.transition('cover'); this.coverPoint = undefined; this.coverRetry = 0;
  }
  private transition(state: TacticalState) {
    if (this.state === state) return;
    this.state = state; this.stateTime = 0; this.replan = 0;
  }
  update(opponent: Pick<DuelTank, 'vehicle'>, player: Pick<DuelTank, 'vehicle'>, visible: boolean,
    dt: number, destination?: Vector3, context?: AIContext) {
    this.timeAlive += dt; this.stateTime += dt;
    this.reaction = Math.max(0, this.reaction - dt); this.reloadPause = Math.max(0, this.reloadPause - dt);
    this.gracePeriod = Math.max(0, this.gracePeriod - dt); this.dangerFor = Math.max(0, this.dangerFor - dt);
    this.coverRetry -= dt; this.replan -= dt;
    const position = opponent.vehicle.node.position, speed = Math.abs(opponent.vehicle.speed ?? 0);
    const nav = context?.navigation, level = AI_DIFFICULTY[this.difficulty];
    const changed = this.trackedVehicle !== player.vehicle;
    if (visible && (!this.wasVisible || changed)) { this.reaction = this.config.fairness.reactionDelay * level.reaction; this.settled = 0; }
    this.wasVisible = visible; this.trackedVehicle = player.vehicle;
    if (visible) {
      this.lastSeen.copyFrom(player.vehicle.node.position); this.hasMemory = true; this.unseenFor = 0;
      this.settled += dt / (1 + speed * .35);
    } else {
      this.unseenFor += dt; this.settled = Math.max(0, this.settled - dt * 2);
      if (this.unseenFor > AI_TACTICS.memorySeconds) this.hasMemory = false;
    }
    if (this.hitPending) {
      const dx = this.hitPoint.x - position.x, dz = this.hitPoint.z - position.z, d = Math.hypot(dx, dz) || 1;
      this.suspected.set(position.x + dx / d * 60, position.y, position.z + dz / d * 60);
      this.hasSuspected = Math.hypot(dx, dz) > .05;
      this.hitPending = false;
    }
    const threat = this.dangerFor > 0 && this.hasSuspected && !visible ? this.suspected : this.hasMemory ? this.lastSeen : context?.report;
    if ((context?.health ?? 100) <= AI_TACTICS.lowHealth && threat && this.state !== 'retreat') {
      this.transition('retreat'); this.coverPoint = undefined; this.coverRetry = 0;
    }
    if (visible && context?.slot === 2 && nav && (this.state === 'advance' || this.state === 'search')) {
      this.coverPoint = nav.graph.tacticalPoint(position, this.lastSeen, false, -1);
      if (this.coverPoint) this.transition('reposition');
    }
    if (this.state === 'cover' || this.state === 'retreat') {
      if (!this.coverPoint && threat && nav && this.coverRetry <= 0) {
        this.coverPoint = nav.graph.tacticalPoint(position, threat, true, (context?.slot ?? 0) % 2 ? -1 : 1);
        this.coverRetry = AI_TACTICS.coverSearchSeconds;
      }
      const reached = this.coverPoint && Math.hypot(this.coverPoint.x - position.x, this.coverPoint.z - position.z) < 6;
      if (this.state === 'cover' && this.reloadPause <= 0 && this.dangerFor <= 0
        && (reached || !nav || this.stateTime > AI_TACTICS.maxCoverSeconds)) {
        this.previousCover = this.coverPoint;
        this.coverPoint = threat && nav ? nav.graph.tacticalPoint(position, threat, false, (context?.slot ?? 0) % 2 ? -1 : 1, this.previousCover) : undefined;
        this.transition(this.coverPoint ? 'reposition' : visible ? 'contact' : 'search');
      }
    } else if (this.state === 'reposition') {
      if (!this.coverPoint || Math.hypot(this.coverPoint.x - position.x, this.coverPoint.z - position.z) < 6 || this.stateTime > 12) {
        this.coverPoint = undefined; this.transition(visible ? 'contact' : 'search');
      }
    } else {
      this.transition(visible ? 'contact' : threat ? 'search' : 'advance');
    }
    let goal = this.coverPoint ?? (this.state === 'cover' || this.state === 'retreat' ? undefined : threat ?? destination);
    // No usable shelter: open distance while keeping the bow towards the known threat, only on safe ground.
    let backing = false;
    if ((this.state === 'cover' || this.state === 'retreat') && !goal && threat) {
      const dx = position.x - threat.x, dz = position.z - threat.z, distance = Math.hypot(dx, dz) || 1;
      this.fallback.set(position.x + dx / distance * 14, position.y, position.z + dz / distance * 14);
      if (!nav || nav.graph.clearSegment(position, this.fallback)) { goal = this.fallback; backing = true; }
    }
    if (nav && goal) {
      if (this.replan <= 0) { nav.request(position, goal); this.replan = FILM_NAV.replanSeconds; }
      goal = nav.follow(position, speed);
    }
    const q = opponent.vehicle.node.rotationQuaternion!;
    const heading = Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
    const threatDistance = threat ? Math.hypot(threat.x - position.x, threat.z - position.z) : Infinity;
    const targetDistance = goal ? Math.hypot(goal.x - position.x, goal.z - position.z) : 0;
    let error = goal ? wrapAngle(Math.atan2(goal.x - position.x, goal.z - position.z) - heading) : 0;
    this.drive.throttle = 0; this.drive.steer = 0; this.drive.brake = 1;
    const holding = visible && this.state === 'contact' && threatDistance <= this.config.engagement.max / level.aggression;
    if (holding || targetDistance < 5.5 || !goal) {
      // Pivot in place; never deliberately present the flank while holding a firing position.
      if (threat) {
        error = wrapAngle(Math.atan2(threat.x - position.x, threat.z - position.z) - heading);
        this.drive.steer = Math.abs(error) > .12 ? clamp(error * 1.6) : 0;
        this.drive.brake = speed > .8 || !this.drive.steer ? 1 : 0;
      }
      if (visible && threatDistance < this.config.engagement.min && (!nav || context?.sensors && context.sensors.rear > 10)) {
        this.drive.throttle = -.3; this.drive.brake = 0; this.drive.steer *= -1;
      }
    } else {
      if (backing) error = wrapAngle(error + Math.PI);
      this.drive.steer = clamp(error * 1.7);
      this.drive.throttle = Math.abs(error) > .55 ? 0 : backing ? this.config.damageReaction.reverseThrottle : .6 * level.aggression;
      this.drive.brake = 0;
      const limit = this.state === 'advance' ? 8 * level.aggression : this.config.movement.cautiousSpeed;
      if (speed > limit || Math.abs(error) > .35 && speed > 3) { this.drive.throttle = 0; this.drive.brake = 1; }
      if (Math.abs(error) > .55 && speed < 1) this.drive.brake = 0;
    }
    if (context?.allies) for (const ally of context.allies) {
      const p = ally.vehicle.node.position, dx = p.x - position.x, dz = p.z - position.z, d = Math.hypot(dx, dz);
      if (d < .05 || d > this.config.spacing.separationDistance) continue;
      const relative = wrapAngle(Math.atan2(dx, dz) - heading);
      if (Math.abs(relative) < 1.3) {
        this.drive.steer = clamp(this.drive.steer + (relative > 0 ? -.7 : .7));
        if (d < 10 && Math.abs(relative) < .65 && this.drive.throttle > 0) {
          this.drive.throttle = 0; this.drive.brake = speed > .8 ? 1 : 0;
        }
      }
    }
    // Short sensor rays are the emergency layer; the global path already includes the whole hull footprint.
    const sensors = context?.sensors;
    if (sensors && this.drive.throttle >= 0 && sensors.front < 8 + speed * .7) {
      this.drive.throttle = 0; this.drive.brake = speed > .7 ? 1 : 0;
      this.drive.steer = sensors.left > sensors.right ? -.8 : .8;
    }
    if (sensors && this.drive.throttle < 0 && sensors.rear < 9) { this.drive.throttle = 0; this.drive.brake = 1; }
    const moved = this.hasPrevious ? Math.hypot(position.x - this.previousPosition.x, position.z - this.previousPosition.z) : Infinity;
    this.previousPosition.copyFrom(position); this.hasPrevious = true;
    this.stuckFor = Math.abs(this.drive.throttle) > .2 && moved < dt * this.config.stuck.speedThreshold ? this.stuckFor + dt : 0;
    if (this.stuckFor > this.config.stuck.detectTime) {
      this.recoveryTimer = this.config.stuck.reverseTime; this.recoverySide *= -1; this.stuckFor = 0;
      nav?.reset(); this.replan = 0;
    }
    if (this.recoveryTimer > 0) {
      this.recoveryTimer = Math.max(0, this.recoveryTimer - dt);
      if (!sensors || sensors.rear > 10) { this.drive.throttle = this.config.stuck.reverseThrottle; this.drive.steer = this.recoverySide * .7; this.drive.brake = 0; }
    }
    this.result.target = undefined; this.result.look = undefined;
    if (visible) {
      const targetSpeed = context?.playerVelocity ? Math.hypot(context.playerVelocity.x, context.playerVelocity.z) : Math.abs(player.vehicle.speed ?? 0);
      const spread = this.config.fairness.aimDispersion;
      this.aimSpread = Math.min(AI_TACTICS.maxSpreadMetres, (spread.base + threatDistance * spread.distanceFactor
        + targetSpeed * spread.speedFactor + speed * AI_TACTICS.ownSpeedSpread) * level.dispersion
        * (1 + 1.4 * Math.exp(-this.settled / AI_TACTICS.settledSeconds)));
      this.sampleIn -= dt;
      if (this.sampleIn <= 0) {
        this.sampleIn = AI_TACTICS.aimSampleSeconds;
        const angle = this.random() * Math.PI * 2, radius = Math.sqrt(this.random());
        this.desiredErrorX = Math.cos(angle) * radius; this.desiredErrorY = Math.sin(angle) * radius * .35;
        if (!this.timeAlive || this.timeAlive <= dt) { this.errorX = this.desiredErrorX; this.errorY = this.desiredErrorY; }
      }
      const blend = 1 - Math.exp(-dt * 5);
      this.errorX += (this.desiredErrorX - this.errorX) * blend; this.errorY += (this.desiredErrorY - this.errorY) * blend;
      const dx = this.lastSeen.x - position.x, dz = this.lastSeen.z - position.z, length = Math.hypot(dx, dz) || 1;
      this.aim.set(this.lastSeen.x + dz / length * this.errorX * this.aimSpread,
        this.lastSeen.y + 1.15 + this.errorY * this.aimSpread, this.lastSeen.z - dx / length * this.errorX * this.aimSpread);
      this.result.target = this.aim;
    } else if (threat || destination) {
      const direction = threat ?? destination!;
      const bearing = Math.atan2(direction.x - position.x, direction.z - position.z)
        + (this.dangerFor > 0 ? 0 : Math.sin(this.timeAlive * .5 + this.seed) * .32);
      this.look.set(position.x + Math.sin(bearing) * 65, position.y + 1.2, position.z + Math.cos(bearing) * 65);
      this.result.look = this.look;
    }
    return this.result;
  }
  shotFired() {
    this.reloadPause = this.config.fairness.reloadTime; this.settled *= .4;
    this.coverPoint = undefined; this.coverRetry = 0; this.transition('cover');
  }
  reset() {
    this.hasMemory = this.hasPrevious = this.wasVisible = this.hitPending = this.hasSuspected = false; this.trackedVehicle = undefined;
    this.unseenFor = this.reaction = this.reloadPause = this.gracePeriod = this.dangerFor = this.stuckFor = this.recoveryTimer = 0;
    this.timeAlive = this.stateTime = this.coverRetry = this.replan = this.settled = this.sampleIn = 0;
    this.errorX = this.errorY = this.desiredErrorX = this.desiredErrorY = this.aimSpread = 0;
    this.coverPoint = this.previousCover = undefined; this.state = 'advance'; this.recoverySide = 1; this.randomState = this.seed;
    this.result.target = this.result.look = undefined;
  }
}
