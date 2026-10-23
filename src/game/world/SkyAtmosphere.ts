import {
  Color3, Color4, Effect, MeshBuilder, Scene, ShaderMaterial, Vector3, type Mesh,
} from '@babylonjs/core';

const VERTEX = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDirection;

void main() {
  vDirection = normalize(position);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
varying vec3 vDirection;

uniform float uTime;
uniform float uFlash;
uniform vec3 uFlashDirection;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uCloudDark;
uniform vec3 uCloudLight;
uniform vec3 uFlashColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.86, 0.5, -0.5, 0.86);
  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + vec2(11.7, 3.1);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec3 direction = normalize(vDirection);
  float height = clamp(direction.y, 0.0, 1.0);

  vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.24, height));
  sky = mix(sky, uZenith, smoothstep(0.2, 0.82, height));
  float horizonGlow = pow(1.0 - height, 5.0);
  sky += uHorizon * horizonGlow * 0.12;

  if (direction.y > -0.08) {
    vec2 plane = direction.xz / max(direction.y + 0.24, 0.045);
    vec2 churn = vec2(
      fbm(plane * 0.42 + vec2(uTime * 0.021, uTime * 0.007)),
      fbm(plane * 0.42 + vec2(5.3 - uTime * 0.014, 2.7 + uTime * 0.011))
    );
    vec2 uv = plane + (churn - 0.5) * 1.85;

    float lower = fbm(uv * 0.5 + vec2(uTime * 0.02, uTime * 0.005));
    float upper = fbm(uv * 1.6 + vec2(-uTime * 0.03, uTime * 0.016) + lower * 0.9);
    float density = lower * 0.58 + upper * 0.42;
    density = smoothstep(0.34, 0.62, density);
    density = floor(density * 8.0 + 0.5) / 8.0;

    float underlight = smoothstep(0.2, 0.8, fbm(uv * 1.05 + vec2(3.1, -uTime * 0.024)) + 0.24);
    vec3 cloud = mix(uCloudDark, uCloudLight, underlight * (1.0 - height * 0.3));
    float sunSide = max(dot(normalize(vec3(direction.x, 0.08, direction.z)),
      normalize(vec3(-0.58, 0.0, 0.53))), 0.0);
    cloud = mix(cloud, uHorizon * 1.08, pow(1.0 - height, 2.6) * (0.18 + sunSide * 0.5));

    float flashReach = max(dot(direction, uFlashDirection), 0.0);
    float flash = uFlash * (0.18 + pow(flashReach, 5.0) * 2.2);
    cloud += uFlashColor * flash * (0.32 + density * 1.3);

    sky = mix(sky, cloud, density);
    sky += uFlashColor * uFlash * pow(max(direction.y, 0.0), 3.0) * 0.1;
  }

  sky += (hash(gl_FragCoord.xy) - 0.5) * 0.014;
  gl_FragColor = vec4(sky, 1.0);
}
`;

const ZENITH = Color3.FromHexString('#151A1D');
const MID = Color3.FromHexString('#46504F');
const HORIZON = Color3.FromHexString('#A87D50');
const CLOUD_DARK = Color3.FromHexString('#1E2324');
const CLOUD_LIGHT = Color3.FromHexString('#8E8878');
const FLASH_COLOR = Color3.FromHexString('#EADDBF');
const FOG_BASE = new Color3(0.38, 0.345, 0.30);
const FOG_FLASH = new Color3(0.62, 0.57, 0.49);

/** Procedural storm sky with drifting turbulence and distant lightning flashes. */
export function createChaoticSky(scene: Scene) {
  Effect.ShadersStore.chaoticSkyVertexShader = VERTEX;
  Effect.ShadersStore.chaoticSkyFragmentShader = FRAGMENT;

  const dome: Mesh = MeshBuilder.CreateSphere('chaotic-atmosphere',
    { diameter: 1800, segments: 32 }, scene);
  const material = new ShaderMaterial('chaotic-sky', scene,
    { vertex: 'chaoticSky', fragment: 'chaoticSky' },
    {
      attributes: ['position'],
      uniforms: [
        'worldViewProjection', 'uTime', 'uFlash', 'uFlashDirection',
        'uZenith', 'uMid', 'uHorizon', 'uCloudDark', 'uCloudLight', 'uFlashColor',
      ],
    });
  material.backFaceCulling = false;
  material.fogEnabled = false;
  material.setColor3('uZenith', ZENITH);
  material.setColor3('uMid', MID);
  material.setColor3('uHorizon', HORIZON);
  material.setColor3('uCloudDark', CLOUD_DARK);
  material.setColor3('uCloudLight', CLOUD_LIGHT);
  material.setColor3('uFlashColor', FLASH_COLOR);
  material.setFloat('uTime', 0);
  material.setFloat('uFlash', 0);
  material.setVector3('uFlashDirection', new Vector3(0, 0.2, 1));
  dome.material = material;
  dome.infiniteDistance = true;
  dome.isPickable = false;

  scene.clearColor = new Color4(FOG_BASE.r, FOG_BASE.g, FOG_BASE.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0039;
  scene.fogColor = FOG_BASE.clone();

  const flashDirection = new Vector3(0, 0.2, 1);
  let elapsed = 0;
  let flash = 0;
  let flashAge = Number.POSITIVE_INFINITY;
  let nextFlash = 2.2 + Math.random() * 3.4;

  const update = (dt: number) => {
    elapsed += dt;
    nextFlash -= dt;
    if (nextFlash <= 0) {
      flashAge = 0;
      nextFlash = 5.5 + Math.random() * 7.5;
      const azimuth = Math.random() * Math.PI * 2;
      const elevation = 0.08 + Math.random() * 0.28;
      flashDirection.set(Math.cos(azimuth), elevation, Math.sin(azimuth)).normalize();
      material.setVector3('uFlashDirection', flashDirection);
    }
    if (flashAge < 1.4) {
      flashAge += dt;
      const pulse = Math.max(0, 1 - flashAge / 0.1);
      const second = flashAge > 0.16 ? Math.max(0, 1 - (flashAge - 0.16) / 0.08) * 0.55 : 0;
      const afterglow = Math.exp(-flashAge * 4.2) * 0.32;
      flash = Math.min(1, pulse + second + afterglow);
    } else {
      flash = 0;
    }
    material.setFloat('uTime', elapsed);
    material.setFloat('uFlash', flash);
    scene.fogColor.set(
      FOG_BASE.r + (FOG_FLASH.r - FOG_BASE.r) * flash * 0.55,
      FOG_BASE.g + (FOG_FLASH.g - FOG_BASE.g) * flash * 0.55,
      FOG_BASE.b + (FOG_FLASH.b - FOG_BASE.b) * flash * 0.55,
    );
  };

  return {
    get flash() { return flash; },
    update,
    dispose() {
      dome.dispose();
      material.dispose();
    },
  };
}
