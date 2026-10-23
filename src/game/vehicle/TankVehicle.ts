import { HavokPlugin, Matrix, PhysicsBody, PhysicsMotionType, PhysicsPrestepType, PhysicsShapeBox,
  Quaternion, TransformNode, Vector3, type Scene } from '@babylonjs/core';
import { IRON_DUST_01, type VehicleDefinition } from './VehicleDefinition.ts';
import type { DriveCommand } from '../input/DriveInput.ts';
import type { TankRig } from './tankRig.ts';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export interface ContactState {
  compression: number; load: number; speed: number; grounded: boolean;
  point: Vector3; normal: Vector3; velocity: Vector3; lateral: Vector3;
  sideSpeed: number; surfaceName: string;
}
const pose = (node: TransformNode) => ({ position: node.position.clone(), rotation: node.rotationQuaternion!.clone() });

export class TankVehicle {
  readonly node: TransformNode;
  readonly body: PhysicsBody;
  readonly shape: PhysicsShapeBox;
  readonly contacts: ContactState[];
  previous: ReturnType<typeof pose>;
  current: ReturnType<typeof pose>;
  speed = 0;
  driveForce = 0;
  private readonly physics;
  readonly scene: Scene;
  readonly rig: TankRig;
  readonly spawn: Vector3;
  readonly definition: Readonly<VehicleDefinition>;
  constructor(scene: Scene, rig: TankRig, spawn: Vector3,
    definition: Readonly<VehicleDefinition> = IRON_DUST_01) {
    this.scene = scene; this.rig = rig; this.spawn = spawn.clone(); this.definition = definition;
    this.physics = scene.getPhysicsEngine()!;
    this.node = new TransformNode('tank-physics', scene);
    this.node.position.copyFrom(spawn.add(rig.center));
    this.node.rotationQuaternion = Quaternion.Identity();
    this.body = new PhysicsBody(this.node, PhysicsMotionType.DYNAMIC, false, scene);
    this.shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), rig.size, scene);
    this.shape.material = { friction: 0.4, restitution: 0 };
    this.body.shape = this.shape;
    this.body.setMassProperties({ mass: definition.mass });
    this.body.setAngularDamping(0.18);
    this.body.setLinearDamping(0);
    this.body.disablePreStep = true;
    this.contacts = rig.wheels.map(() => ({ compression: 0, load: 0, speed: 0, grounded: false,
      point: Vector3.Zero(), normal: Vector3.Up(), velocity: Vector3.Zero(), lateral: Vector3.Right(),
      sideSpeed: 0, surfaceName: '' }));
    this.previous = pose(this.node); this.current = pose(this.node);
  }
  private velocityAt(point: Vector3, linear: Vector3, angular: Vector3) {
    return linear.add(Vector3.Cross(angular, point.subtract(this.node.position)));
  }
  beforeStep(dt: number, command: DriveCommand) {
    this.previous = pose(this.node);
    const d = this.definition;
    const pointMass = d.mass / this.contacts.length;
    const spring = pointMass * 9.81 / d.staticCompression;
    const damper = 2 * Math.sqrt(spring * pointMass) * d.dampingRatio;
    const linear = this.body.getLinearVelocity(), angular = this.body.getAngularVelocity();
    const matrix = Matrix.Compose(Vector3.One(), this.node.rotationQuaternion!, this.node.position);
    const up = Vector3.TransformNormal(Vector3.Up(), matrix).normalize();
    const forward = Vector3.TransformNormal(Vector3.Forward(), matrix).normalize();
    this.speed = Vector3.Dot(linear, forward);
    this.driveForce = 0;
    const steer = command.steer / (1 + Math.abs(this.speed) / 7);
    // Normalize mixed commands to retain the total engine force and power budget.
    const normalization = Math.max(1, Math.abs(command.throttle) + Math.abs(steer));
    for (let index = 0; index < this.contacts.length; index++) {
      const wheel = this.rig.wheels[index], contact = this.contacts[index];
      const mountLocal = wheel.local.add(new Vector3(0, d.suspensionTravel - d.staticCompression, 0));
      const from = Vector3.TransformCoordinates(mountLocal, matrix);
      const length = d.suspensionTravel + wheel.radius;
      const to = from.subtract(up.scale(length));
      const hit = this.physics.raycast(from, to, { ignoreBody: this.body });
      Object.assign(contact, { grounded: false, compression: 0, load: 0, speed: 0, sideSpeed: 0, surfaceName: '' });
      if (!hit.hasHit || Vector3.Dot(hit.hitNormalWorld, up) < 0.25) continue;
      const normal = hit.hitNormalWorld.normalizeToNew();
      const point = hit.hitPointWorld;
      const velocity = this.velocityAt(point, linear, angular);
      const compression = clamp(length - Vector3.Distance(from, point), 0, d.suspensionTravel);
      const load = clamp(spring * compression - damper * Vector3.Dot(velocity, normal), 0, pointMass * 9.81 * 4);
      const tangent = forward.subtract(normal.scale(Vector3.Dot(forward, normal))).normalize();
      const lateral = Vector3.Cross(normal, tangent).normalize();
      const speed = Vector3.Dot(velocity, tangent);
      const sideSpeed = Vector3.Dot(velocity, lateral);
      Object.assign(contact, { grounded: true, compression, load, speed, sideSpeed,
        surfaceName: hit.body?.transformNode.name ?? '' });
      contact.point.copyFrom(point); contact.normal.copyFrom(normal); contact.lateral.copyFrom(lateral);
      contact.velocity.copyFrom(velocity.subtract(normal.scale(Vector3.Dot(velocity, normal))));
      let drive = (command.throttle - wheel.side * steer) / normalization;
      const limit = drive < 0 ? d.reverseSpeed : d.forwardSpeed;
      const directionalSpeed = Math.max(0, speed * Math.sign(drive));
      // Smooth taper over the last 15% of the target speed; never clip velocity.
      const taper = clamp((limit - directionalSpeed) / (limit * 0.15), 0, 1);
      const available = Math.min(d.traction, d.power / Math.max(1, Math.abs(speed)));
      drive *= available / this.contacts.length * taper;
      const rolling = d.rollingResistance * load * Math.tanh(speed / 0.2);
      const braking = command.brake * clamp(speed * pointMass * 10, -d.brakeForce / this.contacts.length, d.brakeForce / this.contacts.length);
      let longitudinalForce = drive - rolling - braking;
      let lateralForce = -sideSpeed * pointMass * d.lateralResponse;
      const magnitude = Math.hypot(longitudinalForce, lateralForce);
      const scale = magnitude > 0 ? Math.min(1, load * d.grip / magnitude) : 1;
      longitudinalForce *= scale; lateralForce *= scale;
      this.driveForce += Math.abs(drive * scale);
      const force = normal.scale(load).add(tangent.scale(longitudinalForce)).add(lateral.scale(lateralForce));
      this.body.applyImpulse(force.scale(dt), point);
    }
  }
  afterStep() {
    this.current = pose(this.node);
    this.speed = Vector3.Dot(this.body.getLinearVelocity(),
      Vector3.TransformNormal(Vector3.Forward(), Matrix.Compose(Vector3.One(), this.current.rotation, Vector3.Zero())));
  }
  reset(position = this.spawn, yaw = 0) {
    this.node.position.copyFrom(position.add(this.rig.center));
    this.node.rotationQuaternion = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
    this.body.setPrestepType(PhysicsPrestepType.TELEPORT);
    this.body.disablePreStep = false;
    (this.physics.getPhysicsPlugin() as HavokPlugin).setPhysicsBodyTransformation(this.body, this.node);
    this.body.disablePreStep = true;
    this.body.setLinearVelocity(Vector3.Zero()); this.body.setAngularVelocity(Vector3.Zero());
    this.previous = pose(this.node); this.current = pose(this.node);
    this.speed = 0; this.driveForce = 0;
    this.contacts.forEach(contact => Object.assign(contact, { grounded: false, compression: 0, load: 0, speed: 0, sideSpeed: 0, surfaceName: '' }));
  }
  dispose() { this.body.dispose(); this.shape.dispose(); this.node.dispose(); }
}
