import { Color3, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, Vector3,
  type Mesh, type PhysicsBody, type Scene } from '@babylonjs/core';
import { resolveArmor, type ArmorResult } from './ArmorModel.ts';
import type { AmmoDefinition } from './WeaponDefinition.ts';
import type { ProjectileHit } from './ProjectileSystem.ts';
import { pathCenter, terrainHeight } from '../world/terrain.ts';

export type ArmorFace = 'front' | 'rear' | 'left' | 'right' | 'top' | 'bottom';
export type ArmorPartKind = 'hull' | 'turret';
export type ArmorThickness = Record<ArmorFace, number>;

export interface ArmorResolution {
  part: ArmorPartKind;
  face: ArmorFace;
  result: ArmorResult;
}

export class ArmorPart {
  readonly mesh: Mesh;
  readonly body: PhysicsBody;
  readonly kind: ArmorPartKind;
  private readonly thickness: ArmorThickness;
  private readonly inverseYaw: Quaternion;
  constructor(scene: Scene, name: string, kind: ArmorPartKind, size: Vector3, position: Vector3,
    yaw: Quaternion, thickness: ArmorThickness, material: StandardMaterial) {
    this.kind = kind;
    this.thickness = thickness;
    this.inverseYaw = yaw.clone();
    this.inverseYaw.conjugate();
    this.mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    this.mesh.position.copyFrom(position);
    this.mesh.rotationQuaternion = yaw.clone();
    this.mesh.material = material;
    this.mesh.isPickable = false;
    this.mesh.computeWorldMatrix(true);
    this.body = new PhysicsAggregate(this.mesh, PhysicsShapeType.BOX,
      { mass: 0, friction: 0.7, restitution: 0 }, scene).body;
  }
  faceFor(worldNormal: Vector3): ArmorFace {
    const local = worldNormal.normalizeToNew().rotateByQuaternionToRef(this.inverseYaw, new Vector3());
    const x = Math.abs(local.x), y = Math.abs(local.y), z = Math.abs(local.z);
    if (z >= x && z >= y) return local.z >= 0 ? 'front' : 'rear';
    if (x >= y) return local.x >= 0 ? 'right' : 'left';
    return local.y >= 0 ? 'top' : 'bottom';
  }
  resolve(ammo: Readonly<AmmoDefinition>, worldNormal: Vector3, directionWorld: Vector3, rangeMeters: number): ArmorResolution {
    const face = this.faceFor(worldNormal);
    return {
      part: this.kind,
      face,
      result: resolveArmor(ammo, this.thickness[face], worldNormal, directionWorld, rangeMeters),
    };
  }
  dispose() {
    this.body.dispose();
    this.mesh.dispose();
  }
}

const HULL_ARMOR: ArmorThickness = { front: 180, rear: 50, left: 80, right: 80, top: 40, bottom: 30 };
const TURRET_ARMOR: ArmorThickness = { front: 220, rear: 60, left: 100, right: 100, top: 50, bottom: 50 };

export class ArmorTarget {
  readonly hull: ArmorPart;
  readonly turret: ArmorPart;
  private readonly decorations: Mesh[];
  constructor(scene: Scene, index: number, x: number, z: number, yaw: number,
    hullMaterial: StandardMaterial, turretMaterial: StandardMaterial, darkMaterial: StandardMaterial) {
    const ground = terrainHeight(x, z);
    const rotation = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
    const hullCenter = new Vector3(x, ground + 1.45, z);
    this.hull = new ArmorPart(scene, `target-${index}-hull`, 'hull', new Vector3(3.4, 2.2, 6.4),
      hullCenter, rotation, HULL_ARMOR, hullMaterial);
    const local = (offset: Vector3) => offset.rotateByQuaternionToRef(rotation, new Vector3())
      .add(hullCenter);
    this.turret = new ArmorPart(scene, `target-${index}-turret`, 'turret', new Vector3(2.6, 1.1, 3.4),
      local(new Vector3(0, 1.65, -0.2)), rotation, TURRET_ARMOR, turretMaterial);
    this.decorations = [
      this.box(scene, `target-${index}-left-track`, new Vector3(0.8, 0.9, 6.8), local(new Vector3(-1.55, -0.9, 0)), rotation, darkMaterial),
      this.box(scene, `target-${index}-right-track`, new Vector3(0.8, 0.9, 6.8), local(new Vector3(1.55, -0.9, 0)), rotation, darkMaterial),
      this.box(scene, `target-${index}-barrel`, new Vector3(0.18, 0.18, 3.8), local(new Vector3(0, 1.65, 3.35)), rotation, darkMaterial),
    ];
  }
  private box(scene: Scene, name: string, size: Vector3, position: Vector3, rotation: Quaternion,
    material: StandardMaterial) {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    mesh.position.copyFrom(position);
    mesh.rotationQuaternion = rotation.clone();
    mesh.material = material;
    mesh.isPickable = false;
    return mesh;
  }
  get parts() { return [this.hull, this.turret]; }
  get shadowCasters() { return [this.hull.mesh, this.turret.mesh, ...this.decorations]; }
  dispose() {
    this.decorations.forEach(mesh => mesh.dispose());
    this.parts.forEach(part => part.dispose());
  }
}

const TARGETS = [
  { x: pathCenter(20), z: 20 },
  { x: pathCenter(60), z: 60 },
  { x: pathCenter(110), z: 110 },
];

/** Static armoured targets; no damage state in M3.1. */
export class ArmorRange {
  readonly targets: ArmorTarget[] = [];
  private readonly partsByBody = new Map<PhysicsBody, ArmorPart>();
  private readonly materials: StandardMaterial[];
  readonly origin: Vector3;
  constructor(scene: Scene, origin: Vector3) {
    this.origin = origin.clone();
    const hull = new StandardMaterial('target-hull', scene);
    hull.diffuseColor = new Color3(0.25, 0.29, 0.26);
    hull.specularColor = new Color3(0.05, 0.05, 0.05);
    const turret = new StandardMaterial('target-turret', scene);
    turret.diffuseColor = new Color3(0.51, 0.52, 0.46);
    turret.specularColor = new Color3(0.05, 0.05, 0.05);
    const dark = new StandardMaterial('target-dark', scene);
    dark.diffuseColor = new Color3(0.2, 0.22, 0.23);
    dark.specularColor = new Color3(0.03, 0.03, 0.03);
    this.materials = [hull, turret, dark];
    TARGETS.forEach((spec, index) => {
      const yaw = Math.atan2(this.origin.x - spec.x, this.origin.z - spec.z);
      const target = new ArmorTarget(scene, index, spec.x, spec.z, yaw, hull, turret, dark);
      this.targets.push(target);
      target.parts.forEach(part => this.partsByBody.set(part.body, part));
    });
  }
  resolve(ammo: Readonly<AmmoDefinition>, hit: ProjectileHit, directionWorld: Vector3, rangeMeters: number) {
    const part = hit.body ? this.partsByBody.get(hit.body) : undefined;
    if (!part) return undefined;
    return part.resolve(ammo, hit.normal, directionWorld, rangeMeters);
  }
  dispose() {
    this.targets.forEach(target => target.dispose());
    this.targets.length = 0;
    this.partsByBody.clear();
    this.materials.forEach(material => material.dispose());
  }
}
