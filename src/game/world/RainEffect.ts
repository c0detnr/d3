import { Effect, Mesh, ShaderMaterial, Vector3, Vector4, VertexData, type Camera, type Scene } from '@babylonjs/core';

/**
 * Camera-bound rain: one mesh, one draw call, animated entirely in the vertex shader (no CPU
 * particles, so it also works when the "low" quality disables particle systems). Drops are
 * world-anchored inside a box that wraps around the camera, so driving through rain reads right.
 * Units: metres and metres per second.
 */
export const RAIN = {
  /** Drawn streak count per quality at full density (WeatherEffects.rain = 1). */
  count: { low: 500, medium: 1100, high: 1800 },
  /** Box around the camera (horizontal half-extent, height). */
  halfExtent: 22, height: 26,
  fallSpeed: 17, streakLength: 0.8, width: 0.009,
  /** Constant drift in x/z, m/s. */
  wind: [2.2, 0.9] as [number, number],
} as const;
export type RainQuality = keyof typeof RAIN.count;

const VERTEX = `
precision highp float;
attribute vec3 position;   // drop seed in [0,1)^3
attribute vec2 uv;         // x: side (-1/1), y: 0 bottom / 1 top
attribute float dropIndex;
uniform mat4 viewProjection;
uniform vec3 uCamera;
uniform float uTime;
uniform float uCount;
uniform vec4 uBox;         // halfExtent, height, fallSpeed, streakLength
uniform vec3 uWind;        // x, z drift, width
varying float vAlpha;

void main() {
  if (dropIndex >= uCount) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAlpha = 0.0; return; }
  float size = uBox.x * 2.0;
  vec3 velocity = vec3(uWind.x, -uBox.z, uWind.y);
  vec3 anchor = position * vec3(size, uBox.y, size) + velocity * uTime;
  vec3 offset = mod(anchor - uCamera + vec3(uBox.x, uBox.y * 0.5, uBox.x), vec3(size, uBox.y, size))
    - vec3(uBox.x, uBox.y * 0.5, uBox.x);
  vec3 head = uCamera + offset;
  vec3 dir = normalize(velocity);
  vec3 world = head - dir * uBox.w * (1.0 - uv.y);
  vec3 toCamera = normalize(uCamera - head);
  vec3 side = normalize(cross(dir, toCamera));
  float distance = length(offset);
  world += side * uv.x * uWind.z * (1.0 + distance * 0.08);
  gl_Position = viewProjection * vec4(world, 1.0);
  vAlpha = (1.0 - smoothstep(uBox.x * 0.55, uBox.x, distance)) * smoothstep(2.5, 7.0, distance) * (0.25 + 0.75 * uv.y);
}
`;

const FRAGMENT = `
precision mediump float;
uniform vec4 uColor;
varying float vAlpha;
void main() {
  if (vAlpha <= 0.003) discard;
  gl_FragColor = vec4(uColor.rgb, uColor.a * vAlpha);
}
`;

/** Lightweight rain curtain; `density` is WeatherEffects.rain. */
export class RainEffect {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly density: number;
  private elapsed = 0;
  constructor(scene: Scene, density: number, quality: RainQuality, tint: [number, number, number] = [0.72, 0.76, 0.82]) {
    this.density = Math.max(0, Math.min(1, density));
    Effect.ShadersStore.weatherRainVertexShader = VERTEX;
    Effect.ShadersStore.weatherRainFragmentShader = FRAGMENT;
    const max = RAIN.count.high;
    const positions: number[] = [], uvs: number[] = [], index: number[] = [], indices: number[] = [];
    let seed = 0x2F6B1D;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < max; i++) {
      const x = random(), y = random(), z = random();
      for (const [u, v] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { positions.push(x, y, z); uvs.push(u, v); index.push(i); }
      const b = i * 4; indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    this.mesh = new Mesh('weather-rain', scene);
    const data = new VertexData(); data.positions = positions; data.uvs = uvs; data.indices = indices;
    data.applyToMesh(this.mesh, false);
    this.mesh.setVerticesData('dropIndex', index, false, 1);
    this.mesh.isPickable = false; this.mesh.alwaysSelectAsActiveMesh = true; this.mesh.doNotSyncBoundingInfo = true;
    this.mesh.receiveShadows = false;
    this.material = new ShaderMaterial('weather-rain', scene, { vertex: 'weatherRain', fragment: 'weatherRain' }, {
      attributes: ['position', 'uv', 'dropIndex'],
      uniforms: ['viewProjection', 'uCamera', 'uTime', 'uCount', 'uBox', 'uWind', 'uColor'], needAlphaBlending: true,
    });
    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;
    this.material.fogEnabled = false;
    this.material.setVector4('uBox', new Vector4(RAIN.halfExtent, RAIN.height, RAIN.fallSpeed, RAIN.streakLength));
    this.material.setVector3('uWind', new Vector3(RAIN.wind[0], RAIN.wind[1], RAIN.width));
    this.material.setVector4('uColor', new Vector4(tint[0], tint[1], tint[2], 0.42));
    this.material.setFloat('uTime', 0);
    this.material.setVector3('uCamera', Vector3.Zero());
    this.mesh.material = this.material;
    this.setQuality(quality);
    this.mesh.setEnabled(this.density > 0);
  }
  setQuality(quality: RainQuality) {
    this.material.setFloat('uCount', Math.round(RAIN.count[quality] * this.density));
  }
  update(dt: number, camera: Camera) {
    if (!this.density) return;
    this.elapsed = (this.elapsed + dt) % 600;
    this.material.setFloat('uTime', this.elapsed);
    this.material.setVector3('uCamera', camera.globalPosition);
  }
  dispose() { this.mesh.dispose(); this.material.dispose(); }
}
