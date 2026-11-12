import { Vector3 } from '@babylonjs/core';
import { KUL_ROUTES } from '../world/kulVadisiLayout.ts';

export const LANE_DRONES = Object.freeze({ interval: 30, group: 3, laneCapacity: 18,
  lifetime: 240, speed: 6, range: 45, fireInterval: 1, hp: 20, tankDamage: 1, droneDamage: 5, mgDamage: 5 });
export type DroneTeam = 'A' | 'B';
export interface DroneTarget { id: string; team: DroneTeam; position: Vector3; hp: number }
export interface LaneDrone extends DroneTarget {
  lane: number; slot: number; previous: Vector3; yaw: number; waypoint: number;
  age: number; cooldown: number; route: Vector3[];
  /** Inside an enemy jammer field this tick: no link, so it neither drives nor fires. */
  jammed: boolean;
}
/** A moving jamming field; metres, horizontal distance. */
export interface DroneJammer { team: DroneTeam; position: Vector3; radius: number }
export function inJammerField(drone: { team: DroneTeam; position: Vector3 }, jammers: readonly DroneJammer[]) {
  return jammers.some(j => j.team !== drone.team
    && (drone.position.x - j.position.x) ** 2 + (drone.position.z - j.position.z) ** 2 <= j.radius ** 2);
}
export interface DroneShot { shooter: LaneDrone; target: DroneTarget }

/** Metres, seconds and HP. No pursuit: movement only consumes this drone's lane waypoints. */
export class LaneDroneModel {
  readonly drones: LaneDrone[] = [];
  elapsed = 0;
  wave = 0;
  private nextWave = LANE_DRONES.interval;
  private serial = 0;

  private readonly height: (x: number, z: number) => number;
  constructor(height: (x: number, z: number) => number) { this.height = height; }

  private spawnWave() {
    this.wave++;
    for (let lane = 0; lane < KUL_ROUTES.length; lane++) {
      // Keep reinforcements symmetric when the safety budget is full on either side.
      if (['A', 'B'].some(team => this.drones.filter(d => d.team === team && d.lane === lane).length
        + LANE_DRONES.group > LANE_DRONES.laneCapacity)) continue;
      for (const team of ['A', 'B'] as const) for (let slot = 0; slot < LANE_DRONES.group; slot++) {
        const points = team === 'A' ? KUL_ROUTES[lane].points : [...KUL_ROUTES[lane].points].reverse();
        const route = points.map(p => new Vector3(p.x, this.height(p.x, p.z), p.z));
        // Along-road spacing keeps each group inside the eighteen-metre roads.
        const direction = route[1].subtract(route[0]).normalize();
        const position = route[0].add(direction.scale(2 + lane * 12 + slot * 3.5));
        position.y = this.height(position.x, position.z);
        this.drones.push({ id: `lane-drone-${++this.serial}`, team, lane, slot, route, position,
          previous: position.clone(), hp: LANE_DRONES.hp, yaw: Math.atan2(direction.x, direction.z),
          waypoint: 1, age: 0, cooldown: slot * .15, jammed: false });
      }
    }
  }

  update(dt: number, tanks: readonly DroneTarget[], canSee: (from: LaneDrone, to: DroneTarget) => boolean,
    canMove: (drone: LaneDrone, to: Vector3) => boolean, shoot: (event: DroneShot) => void, jammers: readonly DroneJammer[] = []) {
    this.elapsed += dt;
    this.removeExpired();
    if (this.elapsed + 1e-8 >= this.nextWave) {
      this.spawnWave(); this.nextWave += LANE_DRONES.interval;
    }
    const targets: readonly DroneTarget[] = [...this.drones, ...tanks];
    for (const drone of this.drones) {
      drone.previous.copyFrom(drone.position);
      if (drone.hp <= 0) continue;
      drone.age += dt; drone.cooldown = Math.max(0, drone.cooldown - dt);
      drone.jammed = inJammerField(drone, jammers);
      if (drone.jammed) continue;
      let target: DroneTarget | undefined, nearest = LANE_DRONES.range ** 2;
      for (const candidate of targets) {
        if (candidate.team === drone.team || candidate.hp <= 0) continue;
        const distance = Vector3.DistanceSquared(drone.position, candidate.position);
        if (distance > nearest || !canSee(drone, candidate)) continue;
        target = candidate; nearest = distance;
      }
      if (target) {
        if (drone.cooldown <= 1e-8) { shoot({ shooter: drone, target }); drone.cooldown = LANE_DRONES.fireInterval; }
        continue;
      }
      let remaining = LANE_DRONES.speed * dt;
      while (remaining > 1e-8 && drone.waypoint < drone.route.length) {
        const destination = drone.route[drone.waypoint];
        const dx = destination.x - drone.position.x, dz = destination.z - drone.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 1e-8) { drone.waypoint++; continue; }
        const travel = Math.min(distance, remaining);
        const to = drone.position.add(new Vector3(dx / distance * travel, 0, dz / distance * travel));
        to.y = this.height(to.x, to.z);
        if (!canMove(drone, to)) break;
        drone.position.copyFrom(to); drone.yaw = Math.atan2(dx, dz); remaining -= travel;
        if (travel === distance) drone.waypoint++;
      }
    }
    this.removeExpired();
  }

  private removeExpired() {
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i];
      if (drone.hp <= 0 || drone.age >= LANE_DRONES.lifetime || drone.waypoint >= drone.route.length) this.drones.splice(i, 1);
    }
  }
  reset() { this.drones.length = 0; this.elapsed = 0; this.wave = 0; this.serial = 0; this.nextWave = LANE_DRONES.interval; }
}
