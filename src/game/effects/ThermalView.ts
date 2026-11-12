import { Color3, Color4, Effect, PostProcess, RenderTargetTexture, StandardMaterial, Texture,
  type AbstractMesh, type Camera, type Scene } from '@babylonjs/core';
import type { SightMode } from '../aim/gunnerSightModel.ts';

Effect.ShadersStore['ironDustThermalFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D heatSampler;
uniform float polarity;
uniform float time;
void main() {
  vec3 sceneColor = texture2D(textureSampler, vUV).rgb;
  float luminance = dot(sceneColor, vec3(0.2126, 0.7152, 0.0722));
  float heat = texture2D(heatSampler, vUV).r;
  float cold = 0.10 + smoothstep(0.05, 0.85, luminance) * 0.25;
  float signal = mix(cold, 0.94, smoothstep(0.15, 0.85, heat));
  float noise = fract(sin(dot(gl_FragCoord.xy + time, vec2(12.9898,78.233))) * 43758.5453) - 0.5;
  signal = mix(signal, 1.0 - signal, polarity) + noise * 0.018;
  gl_FragColor = vec4(vec3(clamp(signal, 0.0, 1.0)), 1.0);
}`;

/** One half-resolution, depth-tested mask. Original materials are never mutated. */
export class ThermalView {
  private readonly hot = new Set<AbstractMesh>();
  private mask?: RenderTargetTexture;
  private process?: PostProcess;
  private coldMaterial?: StandardMaterial;
  private hotMaterial?: StandardMaterial;
  private mode: SightMode = 'DAY';
  private readonly scene: Scene;
  private readonly camera: Camera;
  private assigned = new WeakSet<AbstractMesh>();
  constructor(scene: Scene, camera: Camera) {
    this.scene = scene; this.camera = camera;

  }
  /** All tank/infantry sources enter here; returns an unregister function for dynamic actors. */
  register(meshes: readonly AbstractMesh[]): () => void {
    for (const mesh of meshes) { this.hot.add(mesh); this.assign(mesh); }
    return () => { for (const mesh of meshes) { this.hot.delete(mesh); this.assign(mesh); } };
  }
  private assign(mesh: AbstractMesh) {
    if (this.mask) {
      this.mask.setMaterialForRendering(mesh, this.hot.has(mesh) ? this.hotMaterial : this.coldMaterial);
      this.assigned.add(mesh);
    }
  }
  setMode(mode: SightMode) {
    this.mode = mode;
    if (mode === 'DAY') { this.release(); return; }
    if (this.process) return;
    const scene = this.scene;
    const material = (name: string, value: number) => {
      const mat = new StandardMaterial(name, scene);
      mat.disableLighting = true; mat.emissiveColor = new Color3(value, value, value);
      mat.diffuseColor = Color3.Black(); mat.specularColor = Color3.Black(); mat.backFaceCulling = false;
      mat.fogEnabled = false;
      return mat;
    };
    this.coldMaterial = material('thermal-cold', 0); this.hotMaterial = material('thermal-hot', 1);
    this.mask = new RenderTargetTexture('thermal-mask', { ratio: 0.5 }, scene, { generateDepthBuffer: true, generateMipMaps: false, samplingMode: Texture.BILINEAR_SAMPLINGMODE });
    this.mask.clearColor = new Color4(0, 0, 0, 1);
    this.mask.activeCamera = this.camera;
    this.mask.useCameraPostProcesses = false;
    this.mask.renderParticles = false; this.mask.renderSprites = false;
    this.mask.renderList = null; // Include cold occluders, with the same camera/depth as the hot actors.
    for (const mesh of scene.meshes) this.assign(mesh);
    // Mesh construction can overwrite render-pass overrides; assign new geometry after construction.
    this.mask.onBeforeBindObservable.add(() => {
      for (const mesh of scene.meshes) if (!this.assigned.has(mesh)) this.assign(mesh);
    });
    scene.customRenderTargets.push(this.mask);
    this.process = new PostProcess('thermal-view', 'ironDustThermal', ['polarity', 'time'], ['heatSampler'], 1, this.camera);
    this.process.onApply = effect => {
      effect.setTexture('heatSampler', this.mask!);
      effect.setFloat('polarity', this.mode === 'BHT' ? 1 : 0);
      effect.setFloat('time', performance.now() / 1000);
    };
  }
  private release() {
    if (!this.mask) return;
    this.process?.dispose(this.camera); this.process = undefined;
    for (const mesh of this.scene.meshes) this.mask.setMaterialForRendering(mesh, undefined);
    const index = this.scene.customRenderTargets.indexOf(this.mask);
    if (index >= 0) this.scene.customRenderTargets.splice(index, 1);
    this.mask.dispose(); this.mask = undefined; this.assigned = new WeakSet();
    this.coldMaterial?.dispose(); this.hotMaterial?.dispose();
    this.coldMaterial = undefined; this.hotMaterial = undefined;
    for (const mesh of this.hot) if (mesh.isDisposed()) this.hot.delete(mesh);
  }
  dispose() {
    this.release(); this.hot.clear();
  }
}
