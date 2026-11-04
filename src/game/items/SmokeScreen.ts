import { Effect, Matrix, PostProcess, Texture, type Camera, type Scene, type DepthRenderer } from '@babylonjs/core';
import '@babylonjs/core/Rendering/depthRendererSceneComponent.js';
import { SMOKE, smokeStrength, type SmokeModel } from './SmokeModel.ts';

const VS = SMOKE.verticalScale.toFixed(2);
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
uniform float time;
float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// Slowly drifting, rising billows (metres).
float billow(vec3 p) {
  p = p * .32 + vec3(-.12, -.22, -.05) * time;
  float n = noise(p) * .55; p = p * 2.03 + vec3(1.7, 9.2, 3.1); n += noise(p) * .3; p = p * 2.01; n += noise(p) * .15;
  return n;
}
void main() {
  vec4 source = texture2D(textureSampler, vUV);
  vec4 depthTexel = texture2D(depthSampler, vUV);
  float depth = mix(depthTexel.r, dot(depthTexel, vec4(1.0/16581375.0, 1.0/65025.0, 1.0/255.0, 1.0)), packedDepth);
  vec4 world = inverseViewProjection * vec4(vUV * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 end = world.xyz / world.w;
  vec3 delta = end - eye;
  float distance = length(delta);
  vec3 direction = delta / max(distance, .0001);
  float opticalDepth = 0.0, detail = 0.0, height = 0.0, weight = 0.0;
  for (int i = 0; i < 6; i++) {
    if (strengths[i] <= 0.0) continue;
    vec3 offset = eye - clouds[i].xyz;
    offset.y /= ${VS};
    vec3 ray = direction; ray.y /= ${VS};
    float r2 = clouds[i].w * clouds[i].w;
    float a = dot(ray, ray), b = dot(offset, ray), c = dot(offset, offset);
    float disc = b*b - a*(c - r2);
    if (disc <= 0.0) continue;
    float root = sqrt(disc);
    float start = max(0.0, (-b-root)/a), finish = min(distance, (-b+root)/a);
    if (finish <= start) continue;
    // Same soft profile as smokeProfileIntegral(): thin edges, unchanged centre.
    float s0 = start, s1 = finish;
    float profile = (s1-s0)*(1.0-c/r2) - b*(s1*s1-s0*s0)/r2 - a*(s1*s1*s1-s0*s0*s0)/(3.0*r2);
    float cloudDepth = max(0.0, 1.5 * profile) * ${SMOKE.density.toFixed(2)} * strengths[i];
    opticalDepth += cloudDepth;
    // Visual only: billow detail and height sampled across this cloud's segment.
    float n = 0.0, h = 0.0;
    for (int k = 0; k < 3; k++) {
      float s = mix(s0, s1, .2 + .3 * float(k));
      vec3 p = eye + direction * s;
      n += billow(p + clouds[i].xyz * 3.7);
      h += clamp((p.y - clouds[i].y) / (clouds[i].w * ${VS}) * .5 + .5, 0.0, 1.0);
    }
    detail += n / 3.0 * cloudDepth; height += h / 3.0 * cloudDepth; weight += cloudDepth;
  }
  if (weight <= 0.0) { gl_FragColor = source; return; }
  detail /= weight; height /= weight;
  // Billows break up the thin edges; dense cores stay opaque like the gameplay model.
  float visualDepth = opticalDepth * mix(.25, 1.75, smoothstep(.2, .8, detail));
  // Where the AI is blinded (depth >= -ln .2) the player sees at least ~78% cover too.
  float opacity = 1.0 - exp(-max(visualDepth, opticalDepth * smoothstep(1.0, 1.7, opticalDepth)));
  // Sky-lit tops, self-shadowed undersides and dense cores.
  float shadow = 1.0 - exp(-opticalDepth * .35);
  vec3 lit = vec3(.86, .85, .81), dark = vec3(.40, .41, .40);
  vec3 smoke = mix(dark, lit, clamp(height * .75 + detail * .45 - shadow * .25, 0.0, 1.0));
  gl_FragColor = vec4(mix(source.rgb, smoke, opacity), source.a);
}`;

/** Depth-clipped soft volumetric veil with drifting billows: covers distant objects, preserves objects in front, works from inside. */
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
      ['inverseViewProjection', 'eye', 'clouds', 'strengths', 'packedDepth', 'time'], ['depthSampler'], 1, camera);
    this.process.onApply = effect => {
      camera.getViewMatrix().multiply(camera.getProjectionMatrix()).invertToRef(this.inverse);
      effect.setMatrix('inverseViewProjection', this.inverse);
      effect.setVector3('eye', camera.globalPosition);
      effect.setFloat('time', performance.now() / 1000);
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
