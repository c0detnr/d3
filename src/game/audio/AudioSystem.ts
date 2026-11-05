import { SmokeAudio } from './SmokeAudio.ts';
import { IRON_DUST_AUDIO, type AudioDefinition } from './AudioDefinition.ts';

export interface AudioSystemOptions {
  volume?: number;
  muted?: boolean;
  contextFactory?: () => AudioContext;
  definition?: Readonly<AudioDefinition>;
}

export interface AudioGraph {
  context: AudioContext;
  output: GainNode;
}

const clamp01 = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export class AudioSystem {
  private readonly contextFactory: () => AudioContext;
  private readonly definition: Readonly<AudioDefinition>;
  private context?: AudioContext;
  private master?: GainNode;
  private limiter?: DynamicsCompressorNode;
  private smoke?: SmokeAudio;
  private currentVolume: number;
  private currentMuted: boolean;
  private disposed = false;

  constructor(options: AudioSystemOptions = {}) {
    this.definition = options.definition ?? IRON_DUST_AUDIO;
    this.contextFactory = options.contextFactory ??
      (() => new AudioContext({ latencyHint: 'interactive' }));
    this.currentVolume = clamp01(options.volume ?? this.definition.masterGain);
    this.currentMuted = options.muted ?? false;
  }

  get ready() { return this.context !== undefined; }
  get muted() { return this.currentMuted; }
  get volume() { return this.currentVolume; }
  get graph(): AudioGraph | null {
    if (!this.context || !this.master) return null;
    return { context: this.context, output: this.master };
  }

  async unlock(): Promise<boolean> {
    if (this.disposed) return false;
    if (!this.context) {
      let context: AudioContext;
      try { context = this.contextFactory(); } catch { return false; }
      const master = context.createGain();
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = this.definition.limiter.thresholdDb;
      limiter.knee.value = this.definition.limiter.kneeDb;
      limiter.ratio.value = this.definition.limiter.ratio;
      limiter.attack.value = this.definition.limiter.attack;
      limiter.release.value = this.definition.limiter.release;
      master.gain.value = 0;
      master.connect(limiter);
      limiter.connect(context.destination);
      this.context = context;
      this.master = master;
      this.limiter = limiter;
      this.smoke = new SmokeAudio(context, master);
      this.applyGain(0);
    }
    if (this.disposed) return false;
    if (this.context.state === 'suspended') {
      try { await this.context.resume(); } catch { return false; }
    }
    if (this.disposed) return false;
    this.applyGain(this.definition.smoothing);
    if (this.currentMuted) await this.suspend();
    return true;
  }

  setVolume(volume: number) {
    this.currentVolume = clamp01(volume);
    this.applyGain(this.definition.smoothing);
  }

  setMuted(muted: boolean) {
    this.currentMuted = muted;
    this.applyGain(this.definition.smoothing);
    if (!this.context) return;
    if (muted) void this.suspend();
    else void this.resume();
  }

  /** Taps the post-limiter mix for studio takes; null until audio is unlocked. */
  capture(): { stream: MediaStream; release(): void } | null {
    if (!this.context || !this.limiter) return null;
    const limiter = this.limiter;
    const destination = this.context.createMediaStreamDestination();
    limiter.connect(destination);
    return { stream: destination.stream, release: () => { try { limiter.disconnect(destination); } catch { /* closed */ } } };
  }

  async suspend() {
    this.smoke?.reset();
    if (!this.context || this.context.state !== 'running') return;
    try { await this.context.suspend(); } catch { /* unavailable */ }
  }

  async resume() {
    if (!this.context || this.currentMuted) return;
    if (this.context.state !== 'suspended') return;
    try { await this.context.resume(); } catch { /* unavailable */ }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const context = this.context;
    this.smoke?.dispose(); this.smoke = undefined;
    this.master?.disconnect();
    this.limiter?.disconnect();
    this.context = undefined;
    this.master = undefined;
    this.limiter = undefined;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }

  private applyGain(smoothing: number) {
    if (!this.context || !this.master) return;
    const target = this.currentMuted ? 0 : this.currentVolume;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, Math.max(0.001, smoothing));
  }
}
