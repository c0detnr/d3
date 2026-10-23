import type { AudioDefinition } from './AudioDefinition.ts';

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

export class EngineAudio {
  private readonly context: BaseAudioContext;
  private readonly definition: Readonly<AudioDefinition>;
  private readonly low: OscillatorNode;
  private readonly lowFilter: BiquadFilterNode;
  private readonly lowGain: GainNode;
  private readonly harmonic: OscillatorNode;
  private readonly harmonicGain: GainNode;
  private readonly noise: AudioBufferSourceNode;
  private readonly noiseFilter: BiquadFilterNode;
  private readonly noiseGain: GainNode;
  private disposed = false;

  constructor(context: BaseAudioContext, output: AudioNode, definition: Readonly<AudioDefinition>, noiseBuffer: AudioBuffer) {
    this.context = context;
    this.definition = definition;
    const tuning = definition.engine;
    this.low = context.createOscillator();
    this.low.type = 'sawtooth';
    this.low.frequency.value = tuning.lowIdleHz;
    this.lowFilter = context.createBiquadFilter();
    this.lowFilter.type = 'lowpass';
    this.lowFilter.frequency.value = tuning.filterIdleHz;
    this.lowFilter.Q.value = 0.8;
    this.lowGain = context.createGain();
    this.lowGain.gain.value = 0;
    this.low.connect(this.lowFilter);
    this.lowFilter.connect(this.lowGain);
    this.lowGain.connect(output);

    this.harmonic = context.createOscillator();
    this.harmonic.type = 'triangle';
    this.harmonic.frequency.value = tuning.lowIdleHz * 2.02;
    this.harmonicGain = context.createGain();
    this.harmonicGain.gain.value = 0;
    this.harmonic.connect(this.harmonicGain);
    this.harmonicGain.connect(output);

    this.noise = context.createBufferSource();
    this.noise.buffer = noiseBuffer;
    this.noise.loop = true;
    this.noiseFilter = context.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 240;
    this.noiseFilter.Q.value = 1.1;
    this.noiseGain = context.createGain();
    this.noiseGain.gain.value = 0;
    this.noise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(output);

    this.low.start();
    this.harmonic.start();
    this.noise.start();
    this.reset();
  }

  update(rpm: number, load: number) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const smoothing = this.definition.smoothing;
    const tuning = this.definition.engine;
    const lowHz = lerp(tuning.lowIdleHz, tuning.lowMaxHz, rpm);
    this.low.frequency.setTargetAtTime(lowHz, now, smoothing);
    this.lowFilter.frequency.setTargetAtTime(lerp(tuning.filterIdleHz, tuning.filterMaxHz, rpm), now, smoothing);
    this.lowGain.gain.setTargetAtTime(tuning.idleGain + load * tuning.loadGain, now, smoothing);
    this.harmonic.frequency.setTargetAtTime(lowHz * 2.02, now, smoothing);
    this.harmonicGain.gain.setTargetAtTime(tuning.harmonicGain * (0.35 + rpm * 0.65), now, smoothing);
    this.noiseFilter.frequency.setTargetAtTime(200 + rpm * 520, now, smoothing);
    this.noiseGain.gain.setTargetAtTime(tuning.noiseGain * (0.2 + load * 0.8), now, smoothing);
  }

  reset() { this.update(0.16, 0); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.low.stop();
    this.harmonic.stop();
    this.noise.stop();
    this.low.disconnect();
    this.lowFilter.disconnect();
    this.lowGain.disconnect();
    this.harmonic.disconnect();
    this.harmonicGain.disconnect();
    this.noise.disconnect();
    this.noiseFilter.disconnect();
    this.noiseGain.disconnect();
  }
}
