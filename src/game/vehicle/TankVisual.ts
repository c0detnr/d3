import { Matrix, Quaternion, ShaderMaterial, Vector3 } from '@babylonjs/core';
import type { TankModel, TankRig } from './tankRig.ts';
import type { TankVehicle } from './TankVehicle.ts';

/** Art-only animation; the merged track mesh stays intact. */
export class TankVisual {
  private distances: number[];
  private previousCompression: number[];
  private currentCompression: number[];
  private previousDistances: number[];
  private materials: ShaderMaterial[] = [];
  readonly tank: TankModel;
  readonly rig: TankRig;
  constructor(tank: TankModel, rig: TankRig) {
    this.tank = tank; this.rig = rig;
    this.distances = rig.wheels.map(() => 0);
    this.previousCompression = rig.wheels.map(() => 0);
    this.currentCompression = rig.wheels.map(() => 0);
    this.previousDistances = rig.wheels.map(() => 0);
    for (const prefix of ['LeftTrack', 'RightTrack']) {
      const mat = new ShaderMaterial(`${prefix}-temporary-tread`, tank.anchor.getScene(), {
        vertexSource: `precision highp float;
          attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
          uniform mat4 worldViewProjection; uniform mat4 world;
          varying vec3 localPoint; varying vec3 worldNormal; varying vec2 trackUV;
          void main(){ trackUV=uv; localPoint=position; worldNormal=normalize(mat3(world)*normal);
            gl_Position=worldViewProjection*vec4(position,1.0); }`,
        fragmentSource: `precision highp float;
          varying vec3 localPoint; varying vec3 worldNormal; varying vec2 trackUV; uniform float travel; uniform float useTrackUV;
          void main(){ float stripe=step(0.2,fract(mix((localPoint.z+localPoint.y-travel)*4.0,trackUV.y-travel/0.22,useTrackUV)));
            vec3 color=mix(vec3(0.12,0.14,0.15),vec3(0.23,0.25,0.24),stripe);
            float light=0.55+0.6*max(0.0,dot(normalize(worldNormal),normalize(vec3(0.5,1.0,-0.4))));
            gl_FragColor=vec4(color*light,1.0); }`,
      }, { attributes: ['position', 'normal', 'uv'], uniforms: ['worldViewProjection', 'world', 'travel', 'useTrackUV'] });
      mat.setFloat('travel', 0);
      this.materials.push(mat);
      const side = prefix.replace('Track', '');
      const belt = tank.assets.meshes.find(mesh => mesh.metadata?.gltf?.extras?.asset_node_id === `${side}_TrackBelt`);
      mat.setFloat('useTrackUV', belt ? 1 : 0);
      for (const mesh of tank.assets.meshes) if (mesh === belt || mesh.name.startsWith(`${prefix}_Track_Graphite`)) mesh.material = mat;
    }
  }
  fixedUpdate(vehicle: TankVehicle, dt: number) {
    vehicle.contacts.forEach((contact, i) => {
      this.previousDistances[i] = this.distances[i];
      this.distances[i] += contact.speed * dt;
      this.previousCompression[i] = this.currentCompression[i];
      this.currentCompression[i] = contact.compression;
    });
  }
  syncHull(vehicle: TankVehicle, alpha: number) {
    const rotation = Quaternion.Slerp(vehicle.previous.rotation, vehicle.current.rotation, alpha);
    const position = Vector3.Lerp(vehicle.previous.position, vehicle.current.position, alpha);
    const offset = Vector3.TransformNormal(this.rig.center.subtract(this.rig.visualOffset), Matrix.Compose(Vector3.One(), rotation, Vector3.Zero()));
    this.tank.anchor.position.copyFrom(position.subtract(offset));
    this.tank.anchor.rotationQuaternion = rotation;
    this.tank.anchor.computeWorldMatrix(true);
  }
  render(vehicle: TankVehicle, alpha: number) {
    this.syncHull(vehicle, alpha);
    this.rig.wheels.forEach((wheel, i) => {
      const compression = this.previousCompression[i] * (1 - alpha) + this.currentCompression[i] * alpha;
      wheel.node.position.copyFrom(wheel.basePosition);
      wheel.node.position.y += compression - vehicle.definition.staticCompression;
      // GLB wheel pivot's X axis maps to -world X in the unrotated tank.
      wheel.node.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), -(this.previousDistances[i] * (1 - alpha) + this.distances[i] * alpha) / wheel.radius).multiply(wheel.baseRotation);
    });
    ['Left', 'Right'].forEach((name, side) => {
      const indices = this.rig.wheels.map((wheel, i) => wheel.node.name.startsWith(name) ? i : -1).filter(i => i >= 0);
      const distance = indices.reduce((sum, i) => sum + this.previousDistances[i] * (1 - alpha) + this.distances[i] * alpha, 0) / indices.length;
      this.materials[side].setFloat('travel', distance);
    });
  }
  reset() { this.distances.fill(0); this.previousCompression.fill(0); this.currentCompression.fill(0); this.previousDistances.fill(0); }
  dispose() { this.materials.forEach(material => material.dispose()); }
}
