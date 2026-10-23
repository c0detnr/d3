import type { AudioDefinition } from './AudioDefinition.ts';

export class AmbienceAudio {
  private readonly context: BaseAudioContext;
  private readonly definition: Readonly<AudioDefinition>;
  private readonly noise: AudioBufferSourceNode;
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;
  private readonly gust: OscillatorNode;
  private readonly gustDepth: GainNode;
  private disposed = false;

  constructor(context: BaseAudioContext, output: AudioNode, definition: Readonly<AudioDefinition>, noiseBuffer: AudioBuffer) {
    this.context = context;
    this.definition = definition;
    this.noise = context.createBufferSource();
    this.noise.buffer = noiseBuffer;
    this.noise.loop = true;
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = definition.wind.cutoffHz;
    this.filter.Q.value = 0.4;
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    this.gust = context.createOscillator();
    this.gust.type = 'sine';
    this.gust.frequency.value = definition.wind.gustHz;
    this.gustDepth = context.createGain();
    this.gustDepth.gain.value = 0;
    this.gust.connect(this.gustDepth);
    this.gustDepth.connect(this.gain.gain);
    this.noise.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(output);
    this.noise.start();
    this.gust.start();
    this.reset();
  }

  update(level: number) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const smoothing = this.definition.smoothing;
    const tuning = this.definition.wind;
    const base = tuning.baseGain + tuning.speedGain * Math.max(0, Math.min(1, level));
    this.gain.gain.setTargetAtTime(base, now, smoothing);
    this.gustDepth.gain.setTargetAtTime(base * 0.35, now, smoothing);
    this.filter.frequency.setTargetAtTime(tuning.cutoffHz + level * 340, now, smoothing);
  }

  reset() { this.update(0.05); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.noise.stop();
    this.gust.stop();
    this.noise.disconnect();
    this.filter.disconnect();
    this.gain.disconnect();
    this.gust.disconnect();
    this.gustDepth.disconnect();
  }
}
