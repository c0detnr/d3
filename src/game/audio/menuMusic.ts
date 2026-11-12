export function createMenuMusicBuffer(context: BaseAudioContext, seconds = 8): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.ceil(rate * seconds);
  const buffer = context.createBuffer(2, length, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const kickHits = [0.0, 2.0, 4.0, 5.5, 6.0];
  const snareHits = [1.0, 3.0, 5.0, 7.0];
  const melodyNotes = [
    { start: 0.8, freq: 220.0, duration: 1.3 },
    { start: 2.4, freq: 261.63, duration: 1.3 },
    { start: 4.2, freq: 293.66, duration: 1.4 },
    { start: 5.8, freq: 196.0, duration: 1.4 },
  ];

  for (let i = 0; i < length; i++) {
    const t = i / rate;
    const lfo = 0.82 + 0.18 * Math.sin(2 * Math.PI * (1 / seconds) * t);

    // Deep drone layers with 55 Hz fundamental (exact 440 cycles in 8s).
    const droneBaseL = (Math.sin(2 * Math.PI * 55 * t) * 0.55 + Math.sin(2 * Math.PI * 110 * t + 0.3) * 0.22 + Math.sin(2 * Math.PI * 165 * t + 0.6) * 0.1) * lfo;
    const droneBaseR = (Math.sin(2 * Math.PI * 55 * t + 0.1) * 0.55 + Math.sin(2 * Math.PI * 110 * t - 0.2) * 0.22 + Math.sin(2 * Math.PI * 165 * t + 0.4) * 0.1) * lfo;
    const droneL = Math.tanh(droneBaseL * 1.3) * 0.22;
    const droneR = Math.tanh(droneBaseR * 1.3) * 0.22;

    // Martial industrial kick on beats.
    let kickL = 0;
    for (const h of kickHits) {
      if (t >= h && t < h + 0.4) {
        const dt = t - h;
        const kickPhase = 2 * Math.PI * (38 * dt - (52 / 22) * (Math.exp(-dt * 22) - 1));
        const thump = Math.sin(kickPhase) * Math.exp(-dt * 7.5) * 0.35;
        const noise = (((Math.imul((Math.floor(dt * rate) + Math.floor(h * 1000)) >>> 0, 1664525) + 1013904223) >>> 0) / 2147483647.5 - 1);
        kickL += thump + noise * Math.exp(-dt * 45) * 0.08;
      }
    }
    const kickR = kickL;

    // Metallic snare/rim on offbeats.
    let snareL = 0, snareR = 0;
    for (const h of snareHits) {
      if (t >= h && t < h + 0.2) {
        const dt = t - h;
        const noiseL = (((Math.imul((Math.floor(dt * rate) + 7153) >>> 0, 1664525) + 1013904223) >>> 0) / 2147483647.5 - 1);
        const noiseR = (((Math.imul((Math.floor(dt * rate) + 9401) >>> 0, 1664525) + 1013904223) >>> 0) / 2147483647.5 - 1);
        const bandpass = Math.sin(2 * Math.PI * 2200 * dt);
        const env = Math.exp(-dt * 30) * 0.12;
        snareL += noiseL * bandpass * env;
        snareR += noiseR * bandpass * env;
      }
    }

    // Melodic phrases in A/D minor pentatonic.
    let melL = 0, melR = 0;
    for (const n of melodyNotes) {
      if (t >= n.start && t < n.start + n.duration) {
        const dt = t - n.start;
        const envL = (1 - Math.exp(-dt * 30)) * Math.exp(-dt * 2.2);
        const toneL = Math.sin(2 * Math.PI * n.freq * dt) + 0.28 * Math.sin(4 * Math.PI * n.freq * dt);
        melL += toneL * envL * 0.13;

        const dtR = Math.max(0, dt - 0.007);
        const envR = (1 - Math.exp(-dtR * 30)) * Math.exp(-dtR * 2.2);
        const toneR = Math.sin(2 * Math.PI * n.freq * dtR) + 0.28 * Math.sin(4 * Math.PI * n.freq * dtR);
        melR += toneR * envR * 0.13;
      }
    }

    let outL = droneL + kickL + snareL + melL;
    let outR = droneR + kickR + snareR + melR;

    // Boundary crossfade eliminates any sub-millisecond edge discontinuity.
    if (t < 0.015) {
      const taper = t / 0.015;
      outL *= taper;
      outR *= taper;
    } else if (t > seconds - 0.015) {
      const taper = (seconds - t) / 0.015;
      outL *= taper;
      outR *= taper;
    }

    left[i] = outL;
    right[i] = outR;
  }

  // Peak limiter normalization.
  let peak = 0;
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak > 0.85) {
    const factor = 0.85 / peak;
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] *= factor;
    }
  }

  return buffer;
}

export class MenuMusic {
  private readonly context: BaseAudioContext;
  private readonly output: AudioNode;
  private readonly buffer: AudioBuffer;
  private gainNode: GainNode;
  private source?: AudioBufferSourceNode;
  private playing = false;
  private disposed = false;

  constructor(context: BaseAudioContext, output: AudioNode, seconds = 8) {
    this.context = context;
    this.output = output;
    this.gainNode = context.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(output);
    this.buffer = createMenuMusicBuffer(context, seconds);
  }

  get isPlaying() {
    return this.playing;
  }

  play(targetGain = 1.0, fadeTime = 0.8) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    if (!this.source) {
      const src = this.context.createBufferSource();
      src.buffer = this.buffer;
      src.loop = true;
      src.connect(this.gainNode);
      src.onended = () => {
        if (this.source === src) {
          this.source = undefined;
          this.playing = false;
        }
      };
      src.start(now);
      this.source = src;
      this.playing = true;
    }
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetGain)), now + Math.max(0.01, fadeTime));
  }

  fade(targetGain: number, fadeTime = 0.8) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const target = Math.max(0, Math.min(1, targetGain));
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(target, now + Math.max(0.01, fadeTime));
  }

  stop(fadeTime = 0.5) {
    if (this.disposed || !this.source) return;
    const now = this.context.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + Math.max(0.01, fadeTime));

    const src = this.source;
    this.source = undefined;
    this.playing = false;
    setTimeout(() => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        /* already stopped */
      }
    }, (fadeTime + 0.05) * 1000);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch {
        /* ignore */
      }
      this.source = undefined;
    }
    this.gainNode.disconnect();
    this.playing = false;
  }
}
