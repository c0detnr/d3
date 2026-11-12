import { Color3, MeshBuilder, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { MissionDirector, type MissionScore } from './MissionDirector.ts';
import { ROOKIE_AMBUSH_Z, ROOKIE_CHECKPOINTS, ROOKIE_DAY, ROOKIE_SCOUTS } from './rookieDay.ts';
import { pathCenter, terrainHeight } from '../world/terrain.ts';
import { DuelTank } from '../combat/DuelTank.ts';
import { EasyDuelAI } from '../combat/EasyDuelAI.ts';
import { ProjectileSystem, type ProjectileHit } from '../combat/ProjectileSystem.ts';
import { pickTankHit, tankDamageRegion } from '../combat/tankHit.ts';
import { applyDamage, ricochets, type DamageState } from '../combat/DamageModel.ts';
import { IRON_DUST_01_AMMO } from '../combat/WeaponDefinition.ts';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import type { TankModel } from '../vehicle/tankRig.ts';
import type { ArmorRange } from '../combat/ArmorTarget.ts';
import { MissionHud } from '../ui/MissionHud.ts';
interface Scout { id: string; actor: DuelTank; ai: EasyDuelAI; projectiles: ProjectileSystem; decision?: ReturnType<EasyDuelAI['update']> }
interface MissionWorld {
  scene: Scene; player: { vehicle: TankVehicle; tank: TankModel; damage: DamageState }; range: ArmorRange;
  blocksSight: (from: Vector3, to: Vector3) => boolean;
  onFinish: (score: MissionScore) => void;
  onShot: (origin: Vector3, direction: Vector3) => void;
  onPlayerHit: (hit: ProjectileHit, velocity: Vector3, destroyed: boolean) => void;
  onEnemyHit: (hit: ProjectileHit, destroyed: boolean, penetrated: boolean) => void;
  onConfirm: () => void;
  lastFlightActive?: () => boolean;
  interceptProjectile?: (hit: ProjectileHit) => boolean;
}
export class RookieMission {
  readonly director = new MissionDirector(ROOKIE_DAY);
  readonly hud = new MissionHud();
  readonly scouts: Scout[] = [];
  private readonly world: MissionWorld;
  private readonly material: StandardMaterial;
  private readonly rings: ReturnType<typeof MeshBuilder.CreateTorus>[] = [];
  private readonly poles: ReturnType<typeof MeshBuilder.CreateCylinder>[] = [];
  private readonly hitTargets = new Set<number>();
  private disposed = false;
  private ambush = false;
  private ambushPoint?: Vector3;
  private ambushTime = 0;
  private time = 0;
  constructor(world: MissionWorld) {
    this.world = world;
    this.material = new StandardMaterial('mission-checkpoint', world.scene);
    this.material.disableLighting = true; this.material.emissiveColor = Color3.FromHexString('#cce5a0');
    for (const point of ROOKIE_CHECKPOINTS) {
      const centerHeight = terrainHeight(point.x, point.z);
      const path = Array.from({ length: 49 }, (_, i) => {
        const angle = i / 48 * Math.PI * 2, x = point.x + Math.cos(angle) * point.radius, z = point.z + Math.sin(angle) * point.radius;
        return new Vector3(x - point.x, terrainHeight(x, z) - centerHeight + .22, z - point.z);
      });
      const ring = MeshBuilder.CreateTube(`mission-${point.id}`, { path, radius: .09, tessellation: 6 }, world.scene);
      ring.position.set(point.x, centerHeight, point.z); ring.material = this.material; ring.isPickable = false;
      const pole = MeshBuilder.CreateCylinder(`mission-pole-${point.id}`, { height: 3.5, diameter: .16, tessellation: 6 }, world.scene);
      pole.position.copyFrom(ring.position.add(new Vector3(point.radius, 1.75, 0))); pole.material = this.material; pole.isPickable = false;
      this.rings.push(ring); this.poles.push(pole);
    }
    this.director.onStep = completed => {
      this.hud.complete(); world.onConfirm();
      if (completed.id === 'drive') this.hud.say('riza', 'radioRange');
      if (completed.id === 'range') {
        this.ambush = true;
        this.ambushTime = 0;
        this.ambushPoint = world.player.vehicle.node.position.clone();
        const spawnPoints = [...ROOKIE_AMBUSH_Z].sort((a, b) => Math.abs(a - this.ambushPoint!.z) - Math.abs(b - this.ambushPoint!.z));
        for (const [i, scout] of this.scouts.entries()) {
          const z = spawnPoints[i], x = pathCenter(z); scout.actor.reset();
          scout.actor.vehicle.reset(new Vector3(x, terrainHeight(x, z), z), Math.atan2(this.ambushPoint.x - x, this.ambushPoint.z - z));
          scout.actor.tank.anchor.setEnabled(true);
          scout.actor.vehicle.shape.filterCollideMask = 0xffffffff;
          scout.actor.render(1);
          scout.ai.reset();
          scout.ai.setInitialDelay(2.0);
        }
        this.hud.say('colonel', 'radioAmbush'); this.hud.say('defne', 'radioScouts');
      }
    };
    this.director.onFinish = score => world.onFinish(score);
    this.updateMarkers();
  }
  async load(source: string) {
    for (const [i, spawn] of ROOKIE_SCOUTS.entries()) {
      const actor = await DuelTank.load(this.world.scene, source, this.world.player.vehicle.spawn);
      if (this.disposed) { actor.dispose(); return; }
      actor.tank.anchor.setEnabled(false);
      actor.vehicle.shape.filterCollideMask = 0;
      // Inactive scouts stay beneath the terrain until the ambush; no invisible obstacles.
      actor.vehicle.reset(new Vector3(0, -200 - i * 20, 0));
      const projectiles = new ProjectileSystem(this.world.scene, (from, to) => {
        const hit = this.world.scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: actor.vehicle.body, shouldHitTriggers: true });
        const worldHit = hit.hasHit ? { body: hit.body, point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), distance: hit.hitDistance } : undefined;
        return pickTankHit(this.world.scene, this.world.player, from, to, worldHit);
      }, 4);
      this.scouts.push({ id: spawn.id, actor, projectiles, ai: new EasyDuelAI() });
    }
  }
  start() {
    this.director.start(); this.hud.say('defne', 'radioWelcome'); this.hud.say('riza', 'radioDrive'); this.updateMarkers();
  }
  private updateMarkers() {
    this.rings.forEach((ring, i) => { const enabled = this.director.active && this.director.step?.id === 'drive' && i === this.director.progress; ring.setEnabled(enabled); this.poles[i].setEnabled(enabled); });
  }
  /** R recovers the vehicle only. Time, dealt hits and cumulative received damage survive it. */
  recover() {
    for (const scout of this.scouts) scout.projectiles.reset();
  }
  beforeStep(dt: number) {
    if (!this.director.active) return;
    this.director.update(dt);
    if (!this.ambush) return;
    this.ambushTime += dt;
    const { scene, player, blocksSight } = this.world;
    const playerVelocity = player.vehicle.body?.getLinearVelocity?.();
    for (const scout of this.scouts) {
      const actor = scout.actor;
      const from = actor.vehicle.node.position.add(new Vector3(0, 1.2, 0)), to = player.vehicle.node.position.add(new Vector3(0, 1.2, 0));
      const sight = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: actor.vehicle.body, shouldHitTriggers: true });
      const visible = actor.damage.hp > 0 && player.damage.hp > 0 && (!sight.hasHit || sight.body === player.vehicle.body) && !blocksSight(from, to);
      const allies = this.scouts.filter(s => s !== scout && s.actor.damage.hp > 0).map(s => s.actor);
      scout.decision = scout.ai.update(actor, player, visible, dt, player.vehicle.spawn, { allies, playerVelocity });
      actor.beforeStep(dt, scout.decision.drive);
    }
  }
  afterStep(dt: number) {
    if (!this.director.active) return;
    const { player, onShot, onPlayerHit } = this.world;
    const point = ROOKIE_CHECKPOINTS[this.director.progress];
    if (this.director.step?.id === 'drive' && point && Math.hypot(player.vehicle.node.position.x - point.x, player.vehicle.node.position.z - point.z) <= point.radius) {
      this.director.dispatch({ type: 'checkpoint', id: point.id }); this.updateMarkers();
      if (this.director.step?.id === 'drive') { this.hud.complete(); this.world.onConfirm(); }
    }
    if (this.ambush) for (const scout of this.scouts) {
      scout.actor.afterStep(dt, scout.decision?.target ?? null);
      const ray = scout.actor.turret.getMuzzleRay();
      const to = player.vehicle.node.position.add(new Vector3(0, 1.15, 0)).subtract(ray.origin).normalize();
      if (scout.actor.damage.hp > 0 && scout.ai.canShoot && scout.decision?.target && Vector3.Dot(ray.direction, to) > .965) {
        const shot = scout.actor.weapon.fire();
        if (shot) { scout.projectiles.spawn(shot.origin, shot.direction, IRON_DUST_01_AMMO.muzzleVelocity); scout.ai.shotFired(); onShot(shot.origin, shot.direction); }
      }
      scout.projectiles.fixedUpdate(dt, (hit, shell) => {
        if (this.world.interceptProjectile?.(hit)) return;
        if (!this.director.active || hit.body !== player.vehicle.body) return;
        if (this.ambushTime < 2.0) return;
        const penetrated = !ricochets(shell.velocity, hit.normal);
        const previous = player.damage.hp;
        if (penetrated) applyDamage(player.damage, tankDamageRegion(player, hit.point));
        this.director.dispatch({ type: 'damage', amount: previous - player.damage.hp });
        onPlayerHit(hit, shell.velocity, player.damage.hp === 0);
        if (player.damage.hp === 0 && !this.world.lastFlightActive?.()) this.director.dispatch({ type: 'playerDestroyed' });
      });
    }
    if (player.damage.hp === 0 && !this.world.lastFlightActive?.()) this.director.dispatch({ type: 'playerDestroyed' });
  }
  raycast(from: Vector3, to: Vector3, hit: ProjectileHit | undefined) {
    if (!this.ambush) return hit;
    for (const scout of this.scouts) hit = pickTankHit(this.world.scene, scout.actor, from, to, hit);
    return hit;
  }
  shot() { this.director.dispatch({ type: 'shot' }); }
  hitTarget(hit: ProjectileHit) {
    if (!this.director.active) return;
    const index = this.world.range.targets.findIndex(target => target.parts.some(part => part.body === hit.body));
    if (index < 0) return;
    if (this.director.step?.id === 'range') this.hitTargets.add(index);
    this.director.dispatch({ type: 'hit', id: `target${index + 1}` });
  }
  impact(hit: ProjectileHit, velocity: Vector3, cannon: boolean) {
    const scout = this.ambush && this.scouts.find(s => s.actor.vehicle.body === hit.body);
    if (!scout) return false;
    scout.ai.onDamage(hit.point);
    if (!this.director.active) return true;
    this.director.dispatch({ type: 'hit', id: scout.id });
    const penetrated = cannon && !ricochets(velocity, hit.normal);
    const applied = penetrated && applyDamage(scout.actor.damage, tankDamageRegion(scout.actor, hit.point));
    const destroyed = !!applied && scout.actor.damage.hp === 0;
    this.world.onEnemyHit(hit, destroyed, penetrated);
    if (destroyed) this.director.dispatch({ type: 'destroy', id: scout.id });
    return true;
  }
  get waypoint() {
    if (this.director.step?.id === 'drive') return this.rings[this.director.progress]?.position;
    if (this.director.step?.id === 'range') return this.world.range.targets.find((_, i) => !this.hitTargets.has(i))?.hull.mesh.position;
    if (this.ambush) return this.scouts.filter(s => s.actor.damage.hp > 0).sort((a, b) => Vector3.DistanceSquared(a.actor.vehicle.node.position, this.world.player.vehicle.node.position) - Vector3.DistanceSquared(b.actor.vehicle.node.position, this.world.player.vehicle.node.position))[0]?.actor.vehicle.node.position;
    return undefined;
  }
  render(dt: number, alpha: number) {
    this.time += dt;
    this.material.alpha = .75 + Math.sin(this.time * 3) * .2;
    if (this.ambush) for (const scout of this.scouts) { scout.actor.render(alpha); scout.projectiles.render(alpha); }
    this.hud.update(dt, this.director, this.waypoint, this.world.player.vehicle.node.position, this.world.scene);
  }
  /** Only exposed by the DEV session hook; drives the same physical/objective event paths. */
  testAdvance() {
    if (!this.director.active) return;
    if (this.director.step.id === 'drive') {
      const point = ROOKIE_CHECKPOINTS[this.director.progress];
      this.world.player.vehicle.reset(new Vector3(point.x, terrainHeight(point.x, point.z), point.z));
      this.afterStep(0);
    } else if (this.director.step.id === 'range') {
      const target = this.world.range.targets.find((_, i) => !this.hitTargets.has(i))!;
      this.shot(); this.hitTarget({ body: target.hull.body, point: target.hull.mesh.position.clone(), normal: Vector3.Forward(), distance: 10 });
    } else {
      const scout = this.scouts.find(s => s.actor.damage.hp > 0)!;
      const hit = { body: scout.actor.vehicle.body, point: scout.actor.vehicle.node.position.clone(), normal: Vector3.Forward(), distance: 10 };
      for (let i = 0; i < 4; i++) { this.shot(); this.impact(hit, new Vector3(0, 0, -1), true); }
    }
  }
  testDefeat() { this.director.dispatch({ type: 'damage', amount: this.world.player.damage.hp }); this.world.player.damage.hp = 0; this.director.dispatch({ type: 'playerDestroyed' }); }
  dispose() {
    this.disposed = true;
    this.scouts.forEach(s => { s.projectiles.dispose(); s.actor.dispose(); }); this.scouts.length = 0;
    this.rings.forEach(r => r.dispose()); this.poles.forEach(p => p.dispose()); this.material.dispose(); this.hud.dispose();
  }
}
