import { CANNON_AUDIO, type CannonAudioProfile } from './AudioDefinition.ts';

/** Shared helpers for generated one-shots: seconds, Hz, normalised amplitude. */
export const PEAK_TARGET = 0.89;
/** Deterministic white noise in [-1, 1]. */
export function noiseSource(seed: number) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2147483647.5 - 1; };
}
/** One-pole smoothing coefficient for a cutoff frequency. */
export const pole = (hz: number, rate: number) => 1 - Math.exp(-2 * Math.PI * Math.min(hz, rate * 0.45) / rate);
/** Approximate unit-RMS gain for two cascaded one-pole low-passed uniform noise stages. */
export const lowNoiseGain = (coefficient: number) => Math.sqrt(10 / coefficient);
/** Two-pole low-passed noise generator with sample-rate-independent level. */
export function lowNoise(hz: number, rate: number) {
  const a = pole(hz, rate), gain = lowNoiseGain(a);
  let first = 0, second = 0;
  return (white: number) => { first += (white - first) * a; second += (first - second) * a; return second * gain; };
}

/** DC blocking, click-free tail and a common stereo peak normalisation. */
export function finishBuffer(buffer: AudioBuffer, fadeSeconds: number, peakTarget = PEAK_TARGET) {
  const rate = buffer.sampleRate, block = 1 - 2 * Math.PI * 5 / rate;
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    let previous = 0, dc = 0;
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      dc = raw - previous + block * dc; previous = raw;
      const fade = Math.min(1, (data.length - 1 - i) / (rate * fadeSeconds));
      data[i] = dc * fade * fade;
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }
  if (peak > 0) for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] *= peakTarget / peak;
  }
  return buffer;
}

/** Original procedural 120 mm report, generated once per variation. No external recording or license.
 * Layers: crack transient -> felt 40-90 Hz pressure thump -> noise blast body -> rolling rumble with
 * terrain reflections -> quiet breech/recoil mechanism. Channels use different noise and echo timing. */
export function createCannonBlast(context: BaseAudioContext, seed: number,
  profile: Readonly<CannonAudioProfile> = CANNON_AUDIO['01']): AudioBuffer {
  const { seconds, crack, thump, body, rumble, mechanical } = profile, rate = context.sampleRate;
  const buffer = context.createBuffer(2, Math.ceil(rate * seconds), rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    const white = noiseSource(seed + channel * 7919);
    const crackPole = pole(crack.highpassHz, rate);
    const bodyNoise = lowNoise(body.cutoffHz, rate);
    const rumbleNoise = lowNoise(rumble.cutoffHz, rate);
    const echoNoise = lowNoise(Math.min(body.cutoffHz, 480), rate);
    const echoes = rumble.echoes.map((time, index) => ({ time: time + channel * 0.011 * (index + 1), gain: 0.5 * 0.65 ** index }));
    let crackLow = 0, phase = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, w = white();
      crackLow += (w - crackLow) * crackPole;
      const crackLayer = (w - crackLow) * crack.gain * Math.exp(-t * crack.decay);
      const frequency = thump.endHz + (thump.startHz - thump.endHz) * Math.exp(-t / thump.sweep);
      phase += 2 * Math.PI * frequency / rate;
      const thumpLayer = Math.sin(phase) * thump.gain * (1 - Math.exp(-t * 1800)) * Math.exp(-t * thump.decay);
      const bodyLayer = bodyNoise(w) * 0.32 * body.gain * (1 - Math.exp(-t * 1200)) * Math.exp(-t * body.decay);
      const rumbleLayer = rumbleNoise(w) * 0.2 * rumble.gain * (1 - Math.exp(-t / rumble.attack)) * Math.exp(-t * rumble.decay);
      const echoSample = echoNoise(w);
      let echoLayer = 0;
      for (const echo of echoes) if (t > echo.time) {
        const local = t - echo.time;
        echoLayer += echoSample * 0.2 * echo.gain * rumble.gain * (1 - Math.exp(-local * 70)) * Math.exp(-local * 9);
      }
      let mechanicalLayer = 0;
      if (t > mechanical.delay) {
        const local = t - mechanical.delay;
        mechanical.partialsHz.forEach((hz, index) => {
          mechanicalLayer += Math.sin(2 * Math.PI * hz * local) * Math.exp(-local * mechanical.decay * (1 + index * 0.45));
        });
        mechanicalLayer = (mechanicalLayer / mechanical.partialsHz.length + (w - crackLow) * Math.exp(-local * 110))
          * mechanical.gain * Math.min(1, local * 2000);
      }
      // Gentle saturation adds harmonics of the thump that small speakers can reproduce.
      data[i] = Math.tanh((crackLayer + thumpLayer + bodyLayer + rumbleLayer + echoLayer) * 1.4) / 1.4 + mechanicalLayer;
    }
  }
  return finishBuffer(buffer, 0.25);
}
