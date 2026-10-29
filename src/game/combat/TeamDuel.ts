import { Vector3, type PhysicsBody, type Scene } from '@babylonjs/core';
import { DuelTank } from './DuelTank.ts';
import { EasyDuelAI } from './EasyDuelAI.ts';
import { applyDamage, freshDamage, type DamageModule, type DamageState } from './DamageModel.ts';
import { ProjectileSystem, type ProjectileHit } from './ProjectileSystem.ts';
import { pickTankHit, tankDamageRegion } from './tankHit.ts';
import { IRON_DUST_01_WEAPON } from './WeaponDefinition.ts';
import { duelOutcome, teamRoute, teamSpawn, teamYaw, type DuelTeam } from './teamDuelLayout.ts';

export interface DuelParticipant {
  tank: DuelTank['tank']; vehicle: DuelTank['vehicle']; damage: DamageState; team: DuelTeam;
}
export interface TeamImpact {
  hit: ProjectileHit; victim?: DuelParticipant; playerShot: boolean;
  applied: boolean; module: DamageModule | null; disabled: boolean; destroyed: boolean;
}
interface Bot {
  actor: DuelTank; member: DuelParticipant; ai: EasyDuelAI; shells: ProjectileSystem;
  route: Vector3[]; waypoint: number; slot: number; target?: DuelParticipant;
  state?: ReturnType<EasyDuelAI['update']>; delay: number;
}

/** Owns nine bots; the caller advances the shared physics world exactly once per step. */
export class TeamDuel {
  readonly scene: Scene;
  readonly player: DuelParticipant;
  readonly bots: Bot[] = [];
  result?: DuelTeam | 'draw';
  onImpact?: (impact: TeamImpact) => void;
  onShot?: (origin: Vector3, direction: Vector3) => void;
  blocksSight: (from: Vector3, to: Vector3) => boolean = () => false;
  private perception = 0;
  private disposed = false;
  constructor(scene: Scene, player: DuelParticipant) { this.scene = scene; this.player = player; }
  get members() { return [this.player, ...this.bots.map(bot => bot.member)]; }
  get finished() { return this.result !== undefined; }
  alive(team: DuelTeam) { return this.members.filter(member => member.team === team && member.damage.hp > 0).length; }

  async load(source: string | Uint8Array) {
    try {
      for (const team of ['A', 'B'] as const) for (let slot = 0; slot < 5; slot++) {
        if (team === this.player.team && slot === 0) continue;
        const actor = await DuelTank.load(this.scene, source, teamSpawn(team, slot));
        if (this.disposed) { actor.dispose(); return; }
        actor.vehicle.reset(actor.vehicle.spawn, teamYaw(team)); actor.render(1);
        const member: DuelParticipant = { tank: actor.tank, vehicle: actor.vehicle, damage: actor.damage, team };
        const shells = new ProjectileSystem(this.scene, (from, to) => this.raycast(actor.vehicle.body, from, to), 3);
        this.bots.push({ actor, member, shells, ai: new EasyDuelAI(), route: teamRoute(team, slot),
          waypoint: 0, slot, delay: slot * 1.8 });
      }
    } catch (error) { this.dispose(); throw error; }
  }

  raycast(shooter: PhysicsBody, from: Vector3, to: Vector3): ProjectileHit | undefined {
    const hit = this.scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: shooter });
    let closest: ProjectileHit | undefined = hit.hasHit
      ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
    const segment = to.subtract(from), lengthSquared = segment.lengthSquared();
    for (const member of this.members) {
      if (member.vehicle.body === shooter) continue;
      const t = lengthSquared ? Math.max(0, Math.min(1, Vector3.Dot(member.vehicle.node.position.subtract(from), segment) / lengthSquared)) : 0;
      // Only tanks close to this swept segment need a visual turret triangle query.
      if (Vector3.DistanceSquared(member.vehicle.node.position, from.add(segment.scale(t))) > 100) continue;
      closest = pickTankHit(this.scene, member, from, to, closest);
    }
    return closest;
  }

  canSee(observer: DuelParticipant, target: DuelParticipant) {
    const from = observer.vehicle.node.position.add(new Vector3(0, 1.2, 0));
    const to = target.vehicle.node.position.add(new Vector3(0, 1.15, 0));
    if (Vector3.DistanceSquared(from, to) > 180 ** 2 || this.blocksSight(from, to)) return false;
    const hit = this.scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: observer.vehicle.body });
    return !hit.hasHit || hit.body === target.vehicle.body;
  }

  beforeStep(dt: number) {
    this.perception -= dt;
    const sense = this.perception <= 0;
    if (sense) this.perception = .2;
    for (const bot of this.bots) {
      if (this.finished || bot.member.damage.hp === 0) { bot.state = undefined; bot.actor.beforeStep(dt); continue; }
      bot.delay = Math.max(0, bot.delay - dt);
      if (bot.delay > 0) { bot.state = undefined; bot.actor.beforeStep(dt); continue; }
      if (sense) {
        const candidates = this.members.filter(m => m.team !== bot.member.team && m.damage.hp > 0 && this.canSee(bot.member, m));
        const score = (m: DuelParticipant) => Vector3.DistanceSquared(m.vehicle.node.position, bot.member.vehicle.node.position)
          * (m === bot.target ? .75 : 1);
        candidates.sort((a, b) => score(a) - score(b));
        // Retain a lost target briefly so the AI searches its last seen position.
        if (candidates[0]) bot.target = candidates[0];
        else if (bot.target?.damage.hp === 0) bot.target = undefined;
      }
      const position = bot.actor.vehicle.node.position;
      let destination = bot.route[bot.waypoint];
      if (Math.hypot(position.x - destination.x, position.z - destination.z) < 8 && bot.waypoint < bot.route.length - 1) destination = bot.route[++bot.waypoint];
      // A hidden target's current coordinates never enter navigation or aim.
      const visible = !!bot.target && this.canSee(bot.member, bot.target);
      bot.state = bot.ai.update(bot.actor, bot.target ?? this.player, visible, dt, destination);
      let drive = bot.state.drive;
      if (!visible) {
        bot.actor.vehicle.node.computeWorldMatrix(true);
        const forward = bot.actor.vehicle.node.getDirection(Vector3.Forward());
        const blockedByAlly = this.members.some(m => {
          if (m === bot.member || m.team !== bot.member.team || m.damage.hp === 0) return false;
          const offset = m.vehicle.node.position.subtract(position);
          const ahead = Vector3.Dot(offset, forward);
          const lateral = Math.abs(offset.x * forward.z - offset.z * forward.x);
          return ahead > 0 && ahead < 13 && lateral < (m.vehicle.rig.size.x + bot.actor.vehicle.rig.size.x) / 2 + .4;
        });
        if (blockedByAlly && drive.throttle > 0) drive = { throttle: 0, steer: drive.steer, brake: 1 };
      }
      bot.actor.beforeStep(dt, bot.delay > 0 ? { throttle: 0, steer: 0, brake: 1 } : drive);
    }
  }

  afterStep(dt: number) {
    for (const bot of this.bots) {
      let aim = bot.state?.target;
      if (aim && bot.target) {
        const distance = Vector3.Distance(bot.actor.turret.getMuzzleRay().origin, aim);
        const time = distance / IRON_DUST_01_WEAPON.ammo.muzzleVelocity;
        // Bound target lead and compensate gravity using the same training shell speed.
        aim = aim.add(bot.target.vehicle.body.getLinearVelocity().scale(Math.min(.65, time)));
        aim.y += .5 * 9.81 * time * time;
      }
      bot.actor.afterStep(dt, bot.member.damage.modules.turret > 0 ? aim ?? null : null);
      if (this.finished || bot.member.damage.hp === 0 || bot.member.damage.modules.turret === 0 || !aim || !bot.target
        || bot.target.damage.hp === 0 || !bot.ai.canShoot || !bot.actor.weapon.ready || bot.delay > 0) continue;
      const ray = bot.actor.turret.getMuzzleRay();
      const direction = aim.subtract(ray.origin).normalize();
      if (Vector3.Dot(ray.direction, direction) < .999) continue;
      const targetPoint = bot.target.vehicle.node.position.add(new Vector3(0, 1.15, 0));
      const obstruction = this.scene.getPhysicsEngine()!.raycast(ray.origin, targetPoint, { ignoreBody: bot.actor.vehicle.body });
      if ((obstruction.hasHit && obstruction.body !== bot.target.vehicle.body) || this.blocksSight(ray.origin, targetPoint)) continue;
      const shot = bot.actor.weapon.fire();
      if (shot) {
        bot.shells.spawn(shot.origin, shot.direction, IRON_DUST_01_WEAPON.ammo.muzzleVelocity);
        bot.ai.shotFired(); this.onShot?.(shot.origin, shot.direction);
      }
    }
    // All shells, including shells from newly destroyed tanks, advance before the result is resolved.
    for (const bot of this.bots) bot.shells.fixedUpdate(dt, hit => this.impact(bot.member, hit));
  }

  playerImpact(hit: ProjectileHit) { this.impact(this.player, hit); }
  private impact(shooter: DuelParticipant, hit: ProjectileHit) {
    if (this.finished) return;
    const victim = this.members.find(m => m.vehicle.body === hit.body);
    const module = victim ? tankDamageRegion(victim, hit.point) : null;
    const applied = !!victim && victim.team !== shooter.team && applyDamage(victim.damage, module);
    this.onImpact?.({ hit, victim, playerShot: shooter === this.player, module, applied,
      disabled: applied && !!module && victim!.damage.modules[module] === 0,
      destroyed: applied && victim!.damage.hp === 0 });
  }
  finishStep() {
    if (this.finished) return;
    this.result = duelOutcome(this.alive('A'), this.alive('B'));
    if (this.finished) for (const bot of this.bots) bot.shells.reset();
  }
  render(alpha: number) { for (const bot of this.bots) { bot.actor.render(alpha); bot.shells.render(alpha); } }
  reset() {
    this.result = undefined; this.perception = 0;
    for (const bot of this.bots) {
      bot.actor.reset(); bot.actor.vehicle.reset(bot.actor.vehicle.spawn, teamYaw(bot.member.team));
      bot.actor.render(1); bot.member.damage = bot.actor.damage; bot.ai.reset(); bot.shells.reset();
      bot.target = undefined; bot.state = undefined; bot.waypoint = 0; bot.delay = bot.slot * 1.8;
    }
    Object.assign(this.player.damage, freshDamage());
  }
  dispose() {
    this.disposed = true;
    for (const bot of this.bots) { bot.shells.dispose(); bot.actor.dispose(); }
    this.bots.length = 0;
  }
}
