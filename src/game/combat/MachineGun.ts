import { FreeCamera, LoadAssetContainerAsync, Quaternion, Vector3, type AssetContainer, type Scene, type TransformNode } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';
registerBuiltInLoaders();

/** Prototype tuning in radians, metres and seconds. No damage/heat model yet. */
export const MG = Object.freeze({ yawLimit: Math.PI / 3, minElevation: -Math.PI / 18,
  maxElevation: Math.PI / 4, sensitivity: 0.002, roundsPerSecond: 10, speed: 320,
  recoil: 0.018, horizontalFov: 68 * Math.PI / 180 });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export class MachineGun {
  readonly camera: FreeCamera;
  readonly assets: AssetContainer;
  readonly mount: TransformNode;
  readonly yawPivot: TransformNode;
  readonly pitchPivot: TransformNode;
  readonly muzzle: TransformNode;
  readonly cameraPoint: TransformNode;
  readonly recoil: TransformNode;
  private yaw = 0;
  private elevation = 0;
  private cooldown = 0;
  private kick = 0;
  shotsFired = 0;
  limited = false;
  private constructor(scene: Scene, assets: AssetContainer, parent: TransformNode) {
    this.assets = assets;
    const nodes = [...assets.transformNodes, ...assets.meshes];
    const find = (id: string) => {
      const node = nodes.find(n => n.metadata?.gltf?.extras?.asset_node_id === id);
      if (!node) throw new Error(`MG02 joint missing: ${id}`);
      return node;
    };
    this.mount = find('MGMountRoot'); this.yawPivot = find('MGYawPivot');
    this.pitchPivot = find('MGPitchPivot'); this.muzzle = find('MGMuzzlePoint');
    this.cameraPoint = find('MGCameraPoint'); this.recoil = find('MGRecoilRoot');
    // Both assets use the same glTF axes. Inherit the tank's handedness conversion once.
    this.mount.parent = parent;
    this.mount.position.set(0.5, 0.94, 0.85);
    this.camera = new FreeCamera('machine-gun-pov', Vector3.Zero(), scene);
    this.camera.inputs.clear(); this.camera.minZ = 0.035; this.camera.maxZ = 1600;
    this.camera.fovMode = FreeCamera.FOVMODE_HORIZONTAL_FIXED;
    this.camera.fov = MG.horizontalFov;
    this.reset();
  }
  static async load(scene: Scene, source: string | Uint8Array, parent: TransformNode) {
    const assets = await LoadAssetContainerAsync(source, scene, { pluginExtension: '.glb' });
    try {
      if (scene.isDisposed) throw new Error('MG loading completed after scene disposal.');
      assets.addAllToScene();
      return new MachineGun(scene, assets, parent);
    } catch (error) { assets.dispose(); throw error; }
  }
  get angles() { return { yaw: this.yaw, elevation: this.elevation }; }
  look(x: number, y: number) {
    // Tank's glTF parent mirrors X in Babylon's left handed world.
    const yaw = this.yaw - x * MG.sensitivity, elevation = this.elevation - y * MG.sensitivity;
    this.yaw = clamp(yaw, -MG.yawLimit, MG.yawLimit);
    this.elevation = clamp(elevation, MG.minElevation, MG.maxElevation);
    this.limited = yaw !== this.yaw || elevation !== this.elevation;
  }
  private apply() {
    this.yawPivot.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), this.yaw);
    this.pitchPivot.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), -this.elevation);
    this.recoil.position.z = -this.kick;
    for (const node of [this.mount, this.yawPivot, this.pitchPivot, this.recoil, this.muzzle, this.cameraPoint]) node.computeWorldMatrix(true);
  }
  getMuzzleRay() {
    this.apply();
    return { origin: this.muzzle.getAbsolutePosition().clone(),
      direction: Vector3.TransformNormal(Vector3.Forward(), this.muzzle.getWorldMatrix()).normalize() };
  }
  fixedUpdate(dt: number, firing: boolean, emit: (origin: Vector3, direction: Vector3) => void) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.kick *= Math.exp(-dt * 25);
    this.apply();
    if (!firing || this.cooldown > 1e-9) return;
    const shot = this.getMuzzleRay();
    emit(shot.origin, shot.direction);
    this.shotsFired++;
    this.cooldown += 1 / MG.roundsPerSecond;
    this.kick = MG.recoil;
  }
  updateCamera() {
    this.apply();
    const matrix = this.cameraPoint.getWorldMatrix();
    const forward = Vector3.TransformNormal(Vector3.Forward(), matrix).normalize();
    this.camera.upVector.copyFrom(Vector3.TransformNormal(Vector3.Up(), matrix).normalize());
    this.camera.position.copyFrom(this.cameraPoint.getAbsolutePosition());
    this.camera.setTarget(this.camera.position.add(forward.scale(100)));
  }
  reset() { this.yaw = 0; this.elevation = 0; this.cooldown = 0; this.kick = 0; this.shotsFired = 0; this.limited = false; this.apply(); }
  dispose() { this.camera.dispose(); this.assets.dispose(); }
}
