import { RawTexture, Texture, type Scene } from '@babylonjs/core';
import { seededRandom } from './terrain.ts';

/** Metres covered by one repeat of the generated surface textures. */
export const TERRAIN_TEXTURE_METERS = 22;

const SIZE = 1024;
const TAU = Math.PI * 2;
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

const wrap = (value: number, period: number) => ((value % period) + period) % period;

const hash = (x: number, y: number, seed: number) => {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 69069);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
};

/** Tileable value noise so the surface repeats without seams. */
function tileNoise(x: number, y: number, period: number, seed: number) {
  const px = x * period, py = y * period;
  const ix = Math.floor(px), iy = Math.floor(py);
  const tx = smooth(px - ix), ty = smooth(py - iy);
  const x0 = wrap(ix, period), x1 = wrap(ix + 1, period);
  const y0 = wrap(iy, period), y1 = wrap(iy + 1, period);
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed);
  const c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  const top = a + (b - a) * tx, bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function tileFbm(x: number, y: number, period: number, octaves: number, seed: number) {
  let value = 0, amplitude = 0.5, total = 0, current = period;
  for (let octave = 0; octave < octaves; octave++) {
    value += amplitude * tileNoise(x, y, current, seed + octave * 37);
    total += amplitude;
    amplitude *= 0.5;
    current *= 2;
  }
  return value / total;
}

/**
 * Original runtime-generated soil surface. The albedo carries dry-earth mottling,
 * buried grit, stone flecks and hairline cracks; the matching normal map comes from
 * the same height field so pores and stones catch the low storm light.
 */
export function createTerrainSurfaceTextures(scene: Scene) {
  const albedoData = new Uint8Array(SIZE * SIZE * 3);
  const normalData = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const stone = new Float32Array(SIZE * SIZE);
  const crack = new Float32Array(SIZE * SIZE);
  const random = seededRandom(90210);
  const index = (x: number, y: number) => wrap(y, SIZE) * SIZE + wrap(x, SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE, v = y / SIZE;
      const macro = tileFbm(u, v, 3, 4, 11);
      const mid = tileFbm(u, v, 9, 3, 23);
      const grit = tileNoise(u, v, 96, 31);
      const powder = tileNoise(u, v, 192, 43);
      const ridge = 1 - Math.abs(tileFbm(u, v, 6, 3, 57) * 2 - 1);
      const fineRidge = 1 - Math.abs(tileFbm(u, v, 17, 2, 71) * 2 - 1);
      const split = smooth((ridge - 0.905) / 0.1);
      const hairline = smooth((fineRidge - 0.94) / 0.08) * 0.3;
      const slot = Math.max(split, hairline);
      const i = y * SIZE + x;
      crack[i] = slot;
      height[i] = (macro - 0.5) * 0.52
        + (mid - 0.5) * 0.30
        + (grit - 0.5) * 0.12
        + (powder - 0.5) * 0.06
        - slot * 0.13;
    }
  }

  // Scattered stones, roughly one every 0.5 m² at the 22 m repeat.
  for (let pebble = 0; pebble < 3200; pebble++) {
    const centerX = random() * SIZE, centerY = random() * SIZE;
    const large = random() < 0.1;
    const radius = large ? 3.2 + random() * 4.4 : 1 + random() * 2.2;
    const lobes = 3 + Math.floor(random() * 3);
    const phase = random() * TAU;
    const lift = 0.14 + random() * 0.2;
    const reach = Math.ceil(radius * 1.4);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const distance = Math.hypot(dx, dy);
        if (distance > radius * 1.4) continue;
        const angle = Math.atan2(dy, dx);
        const edge = radius * (0.78 + 0.22 * Math.sin(angle * lobes + phase));
        const i = index(Math.round(centerX) + dx, Math.round(centerY) + dy);
        if (distance <= edge) {
          const profile = 1 - distance / edge;
          const shaped = profile * profile * (3 - 2 * profile);
          height[i] += lift * shaped;
          stone[i] = Math.max(stone[i], shaped);
        } else if (distance < edge * 1.34) {
          const rim = 1 - (distance - edge) / (edge * 0.34);
          height[i] -= 0.055 * rim * rim;
        }
      }
    }
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const u = x / SIZE, v = y / SIZE;
      const macro = tileFbm(u, v, 3, 4, 11);
      const mid = tileFbm(u, v, 9, 3, 23);
      const grain = tileNoise(u, v, 160, 89);
      const stubble = Math.max(0, grain - 0.68) / 0.32;
      const damp = Math.max(0, 0.42 - mid) / 0.42;
      const cavity = Math.max(0, Math.min(1,
        ((height[index(x - 1, y)] + height[index(x + 1, y)]
          + height[index(x, y - 1)] + height[index(x, y + 1)]) * 0.25 - height[i]) * 4.2));
      const luminance = Math.max(0.42, Math.min(1,
        0.872
        + (macro - 0.5) * 0.15
        + (mid - 0.5) * 0.11
        + (grain - 0.5) * 0.09
        + stone[i] * 0.11
        + stubble * 0.055
        - crack[i] * 0.17
        - damp * 0.06
        - cavity * 0.34));
      const warmth = macro * 0.55 + mid * 0.45;
      albedoData[i * 3] = Math.round(Math.min(255, luminance * (0.995 + warmth * 0.025) * 255));
      albedoData[i * 3 + 1] = Math.round(Math.min(255, luminance * (0.978 + warmth * 0.014) * 255));
      albedoData[i * 3 + 2] = Math.round(Math.min(255, luminance * (0.928 + (1 - warmth) * 0.045) * 255));

      const left = height[index(x - 1, y)] - height[index(x + 1, y)];
      const back = height[index(x, y - 1)] - height[index(x, y + 1)];
      const normalX = Math.max(-1, Math.min(1, left * 2.6));
      const normalY = Math.max(-1, Math.min(1, back * 2.6));
      const inverseLength = 1 / Math.hypot(normalX, normalY, 1);
      normalData[i * 3] = Math.round((normalX * inverseLength * 0.5 + 0.5) * 255);
      normalData[i * 3 + 1] = Math.round((normalY * inverseLength * 0.5 + 0.5) * 255);
      normalData[i * 3 + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
    }
  }

  // Fallen twigs and dry leaf litter break up the mineral surface without geometry cost.
  const litterRandom = seededRandom(47311);
  for (let twig = 0; twig < 520; twig++) {
    const centerX = litterRandom() * SIZE, centerY = litterRandom() * SIZE;
    const length = 2 + litterRandom() * 6;
    const angle = litterRandom() * TAU;
    const shade = 0.46 + litterRandom() * 0.28;
    const steps = Math.max(1, Math.ceil(length));
    for (let step = 0; step <= steps; step++) {
      const along = (step / steps - 0.5) * length;
      const i = index(Math.round(centerX + Math.cos(angle) * along),
        Math.round(centerY + Math.sin(angle) * along));
      albedoData[i * 3] = Math.round(albedoData[i * 3] * shade);
      albedoData[i * 3 + 1] = Math.round(albedoData[i * 3 + 1] * (shade * 0.94));
      albedoData[i * 3 + 2] = Math.round(albedoData[i * 3 + 2] * (shade * 0.78));
    }
  }
  for (let leaf = 0; leaf < 240; leaf++) {
    const centerX = Math.round(litterRandom() * SIZE), centerY = Math.round(litterRandom() * SIZE);
    const radius = 1 + litterRandom() * 2.2;
    const shade = 0.62 + litterRandom() * 0.22;
    const green = litterRandom() < 0.35;
    const reach = Math.ceil(radius);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (Math.hypot(dx, dy) > radius) continue;
        const i = index(centerX + dx, centerY + dy);
        albedoData[i * 3] = Math.round(albedoData[i * 3] * shade * (green ? 0.84 : 1));
        albedoData[i * 3 + 1] = Math.round(albedoData[i * 3 + 1] * shade);
        albedoData[i * 3 + 2] = Math.round(albedoData[i * 3 + 2] * shade * (green ? 0.86 : 0.84));
      }
    }
  }

  const DETAIL_SIZE = 256;
  const detailData = new Uint8Array(DETAIL_SIZE * DETAIL_SIZE * 4);
  const detailHeight = new Float32Array(DETAIL_SIZE * DETAIL_SIZE);
  for (let y = 0; y < DETAIL_SIZE; y++) {
    for (let x = 0; x < DETAIL_SIZE; x++) {
      const u = x / DETAIL_SIZE, v = y / DETAIL_SIZE;
      const clump = tileFbm(u, v, 8, 3, 101);
      const grain = tileNoise(u, v, 64, 113);
      detailHeight[y * DETAIL_SIZE + x] = (clump - 0.5) * 0.55 + (grain - 0.5) * 0.45;
    }
  }
  for (let y = 0; y < DETAIL_SIZE; y++) {
    for (let x = 0; x < DETAIL_SIZE; x++) {
      const i = y * DETAIL_SIZE + x;
      const u = x / DETAIL_SIZE, v = y / DETAIL_SIZE;
      const clump = tileFbm(u, v, 8, 3, 101);
      const grain = tileNoise(u, v, 64, 113);
      const left = detailHeight[wrap(y, DETAIL_SIZE) * DETAIL_SIZE + wrap(x - 1, DETAIL_SIZE)]
        - detailHeight[wrap(y, DETAIL_SIZE) * DETAIL_SIZE + wrap(x + 1, DETAIL_SIZE)];
      const back = detailHeight[wrap(y - 1, DETAIL_SIZE) * DETAIL_SIZE + wrap(x, DETAIL_SIZE)]
        - detailHeight[wrap(y + 1, DETAIL_SIZE) * DETAIL_SIZE + wrap(x, DETAIL_SIZE)];
      const normalX = Math.max(-1, Math.min(1, left * 3.4));
      const normalY = Math.max(-1, Math.min(1, back * 3.4));
      const inverseLength = 1 / Math.hypot(normalX, normalY, 1);
      const tone = 0.5 + (clump - 0.5) * 0.34 + (grain - 0.5) * 0.3;
      detailData[i * 4] = Math.round(Math.max(0, Math.min(1, tone)) * 255);
      detailData[i * 4 + 1] = Math.round((normalY * inverseLength * 0.5 + 0.5) * 255);
      detailData[i * 4 + 2] = 128;
      detailData[i * 4 + 3] = Math.round((normalX * inverseLength * 0.5 + 0.5) * 255);
    }
  }
  const detail = RawTexture.CreateRGBATexture(detailData, DETAIL_SIZE, DETAIL_SIZE, scene,
    true, false, Texture.TRILINEAR_SAMPLINGMODE);
  detail.name = 'terrain-soil-detail';
  detail.wrapU = Texture.WRAP_ADDRESSMODE;
  detail.wrapV = Texture.WRAP_ADDRESSMODE;
  detail.anisotropicFilteringLevel = 8;
  detail.uScale = 6.3;
  detail.vScale = 6.3;
  detail.gammaSpace = false;

  const albedo = RawTexture.CreateRGBTexture(albedoData, SIZE, SIZE, scene,
    true, false, Texture.TRILINEAR_SAMPLINGMODE);
  albedo.name = 'terrain-soil-albedo';
  albedo.wrapU = Texture.WRAP_ADDRESSMODE;
  albedo.wrapV = Texture.WRAP_ADDRESSMODE;
  albedo.anisotropicFilteringLevel = 8;

  const normal = RawTexture.CreateRGBTexture(normalData, SIZE, SIZE, scene,
    true, false, Texture.TRILINEAR_SAMPLINGMODE);
  normal.name = 'terrain-soil-normal';
  normal.wrapU = Texture.WRAP_ADDRESSMODE;
  normal.wrapV = Texture.WRAP_ADDRESSMODE;
  normal.anisotropicFilteringLevel = 8;
  normal.level = 0.9;

  return {
    albedo,
    normal,
    detail,
    dispose() {
      albedo.dispose();
      normal.dispose();
      detail.dispose();
    },
  };
}
