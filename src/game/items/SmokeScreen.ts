import { Effect, Matrix, PostProcess, Texture, type Camera, type Scene, type DepthRenderer } from '@babylonjs/core';
import '@babylonjs/core/Rendering/depthRendererSceneComponent.js';
import { SMOKE, smokeStrength, type SmokeModel } from './SmokeModel.ts';

Effect.ShadersStore['ironDustSmokeFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D depthSampler;
uniform mat4 inverseViewProjection;
uniform vec3 eye;
uniform vec4 clouds[6];
uniform float strengths[6];
uniform float packedDepth;
void main() {
  vec4 source = texture2D(textureSampler, vUV);
  vec4 depthTexel = texture2D(depthSampler, vUV);
  float depth = mix(depthTexel.r, dot(depthTexel, vec4(1.0/16581375.0, 1.0/65025.0, 1.0/255.0, 1.0)), packedDepth);
  vec4 world = inverseViewProjection * vec4(vUV * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 end = world.xyz / world.w;
  vec3 delta = end - eye;
  float distance = length(delta);
  vec3 direction = delta / max(distance, .0001);
  float opticalDepth = 0.0;
  for (int i = 0; i < 6; i++) {
    if (strengths[i] <= 0.0) continue;
    vec3 offset = eye - clouds[i].xyz;
    offset.y /= ${SMOKE.verticalScale.toFixed(2)};
    vec3 ray = direction; ray.y /= ${SMOKE.verticalScale.toFixed(2)};
    float a = dot(ray, ray), b = dot(offset, ray);
    float disc = b*b - a*(dot(offset, offset) - clouds[i].w*clouds[i].w);
    if (disc <= 0.0) continue;
    float root = sqrt(disc);
    float start = max(0.0, (-b-root)/a), finish = min(distance, (-b+root)/a);
    opticalDepth += max(0.0, finish-start) * ${SMOKE.density.toFixed(2)} * strengths[i];
  }
  float opacity = 1.0 - exp(-opticalDepth);
  vec3 point = eye + direction * min(distance, 15.0);
  float folds = sin(point.x*.63 + sin(point.z*.4)) * sin(point.y*.9 + point.z*.32);
  vec3 smoke = vec3(.59, .60, .56) + folds * .035;
  gl_FragColor = vec4(mix(source.rgb, smoke, opacity), source.a);
}`;

/** Depth-clipped volumetric veil: covers distant objects, preserves objects in front, works from inside. */
export class SmokeScreen {
  private camera?: Camera;
  private depth?: DepthRenderer;
  private process?: PostProcess;
  private readonly inverse = Matrix.Identity();
  private readonly centers = new Float32Array(24);
  private readonly strengths = new Float32Array(6);
  private readonly scene: Scene;
  private readonly model: SmokeModel;

  constructor(scene: Scene, model: SmokeModel) { this.scene = scene; this.model = model; }

  update() {
    const camera = this.scene.activeCamera;
    if (!camera || !this.model.clouds.some(c => smokeStrength(c.age) > 0)) { this.release(); return; }
    if (camera === this.camera) return;
    this.release(); this.camera = camera;
    this.depth = this.scene.enableDepthRenderer(camera, true, true, Texture.NEAREST_SAMPLINGMODE);
    this.depth.useOnlyInActiveCamera = true;
    this.process = new PostProcess('smoke-screen', 'ironDustSmoke',
      ['inverseViewProjection', 'eye', 'clouds', 'strengths', 'packedDepth'], ['depthSampler'], 1, camera);
    this.process.onApply = effect => {
      camera.getViewMatrix().multiply(camera.getProjectionMatrix()).invertToRef(this.inverse);
      effect.setMatrix('inverseViewProjection', this.inverse);
      effect.setVector3('eye', camera.globalPosition);
      this.centers.fill(0); this.strengths.fill(0);
      this.model.clouds.slice(0, 6).forEach((cloud, index) => {
        const strength = smokeStrength(cloud.age);
        this.centers.set([cloud.center.x, cloud.center.y, cloud.center.z, SMOKE.radius * (.35 + .65 * strength)], index * 4);
        this.strengths[index] = strength;
      });
      effect.setFloatArray4('clouds', this.centers);
      effect.setFloatArray('strengths', this.strengths);
      effect.setFloat('packedDepth', Number(this.depth!.isPacked));
      effect.setTexture('depthSampler', this.depth!.getDepthMap());
    };
  }

  private release() {
    this.process?.dispose(this.camera);
    if (this.camera) this.scene.disableDepthRenderer(this.camera);
    this.camera = undefined; this.depth = undefined; this.process = undefined;
  }
  dispose() { this.release(); }
}
