import { Vector3, type Scene } from '@babylonjs/core';
import { loadTankModel } from '../vehicle/loadTankModel.ts';
import { extractTankRig, type TankModel } from '../vehicle/tankRig.ts';
import { TankVehicle } from '../vehicle/TankVehicle.ts';
import { TankVisual } from '../vehicle/TankVisual.ts';
import { TurretController } from '../vehicle/TurretController.ts';
import { WeaponSystem } from './WeaponSystem.ts';
import { freshDamage, driveDisabled } from './DamageModel.ts';
import type { DriveCommand } from '../input/DriveInput.ts';

const parked: DriveCommand = { throttle: 0, steer: 0, brake: 1 };

/** Shared tank systems for the parked local target and server-controlled LAN vehicles. */
export class DuelTank {
  damage = freshDamage();
  readonly vehicle: TankVehicle;
  readonly visual: TankVisual;
  readonly turret: TurretController;
  readonly weapon: WeaponSystem;
  readonly tank: TankModel;
  constructor(scene: Scene, tank: TankModel, spawn: Vector3) {
    this.tank = tank;
    const rig = extractTankRig(tank);
    // Validate the GLB joints before allocating the physics body and visual materials.
    this.turret = new TurretController(tank);
    this.weapon = new WeaponSystem(this.turret);
    this.vehicle = new TankVehicle(scene, rig, spawn);
    this.visual = new TankVisual(tank, rig);
    this.reset();
  }
  static async load(scene: Scene, source: string | Uint8Array, spawn: Vector3) {
    const tank = await loadTankModel(scene, source, spawn);
    try { return new DuelTank(scene, tank, spawn); }
    catch (error) { tank.dispose(); throw error; }
  }
  beforeStep(dt: number, command: DriveCommand = parked) { this.vehicle.beforeStep(dt, driveDisabled(this.damage) ? parked : command); }
  afterStep(dt: number) {
    this.vehicle.afterStep();
    this.visual.fixedUpdate(this.vehicle, dt);
    this.visual.syncHull(this.vehicle, 1);
    this.turret.fixedUpdate(null, dt);
    this.weapon.fixedUpdate(dt);
  }
  render(alpha: number) {
    this.visual.render(this.vehicle, alpha);
    this.turret.render(alpha);
    this.weapon.render(alpha);
  }
  reset() {
    this.damage = freshDamage();
    this.vehicle.reset(this.vehicle.spawn, Math.PI);
    this.visual.reset(); this.turret.reset(); this.weapon.reset();
    this.render(1);
  }
  dispose() {
    this.turret.dispose(); this.visual.dispose(); this.vehicle.dispose(); this.tank.dispose();
  }
}
