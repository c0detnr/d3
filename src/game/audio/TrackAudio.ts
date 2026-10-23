import type { AudioDefinition } from './AudioDefinition.ts';
import type { TrackSideState } from './VehicleAudioModel.ts';

class TrackSide {
  private readonly context: BaseAudioContext;
  private readonly definition: Readonly<AudioDefinition>;
  private readonly bed: AudioBufferSourceNode;
  private readonly bedFilter: BiquadFilterNode;
  private readonly bedGain: GainNode;
  private readonly thump: OscillatorNode;
  private readonly thumpFilter: BiquadFilterNode;
  private readonly thumpGain: GainNode;
  private readonly modulation: OscillatorNode;
  private readonly bedDepth: GainNode;
  private readonly thumpDepth: GainNode;
  private readonly panner: StereoPannerNode;
  private disposed = false;

  constructor(context: BaseAudioContext, output: AudioNode, definition: Readonly<AudioDefinition>,
    noiseBuffer: AudioBuffer, pan: number) {
    this.context = context;
    this.definition = definition;
    const tuning = definition.tracks;
    this.bed = context.createBufferSource();
    this.bed.buffer = noiseBuffer;
    this.bed.loop = true;
    this.bedFilter = context.createBiquadFilter();
    this.bedFilter.type = 'bandpass';
    this.bedFilter.frequency.value = tuning.filterHz;
    this.bedFilter.Q.value = tuning.filterQ;
    this.bedGain = context.createGain();
    this.bedGain.gain.value = 0;
    this.bed.connect(this.bedFilter);
    this.bedFilter.connect(this.bedGain);

    this.thump = context.createOscillator();
    this.thump.type = 'triangle';
    this.thump.frequency.value = 34;
    this.thumpFilter = context.createBiquadFilter();
    this.thumpFilter.type = 'lowpass';
    this.thumpFilter.frequency.value = 150;
    this.thumpGain = context.createGain();
    this.thumpGain.gain.value = 0;
    this.thump.connect(this.thumpFilter);
    this.thumpFilter.connect(this.thumpGain);

    this.modulation = context.createOscillator();
    this.modulation.type = 'square';
    this.modulation.frequency.value = 0.7;
    this.bedDepth = context.createGain();
    this.bedDepth.gain.value = 0;
    this.thumpDepth = context.createGain();
    this.thumpDepth.gain.value = 0;
    this.modulation.connect(this.bedDepth);
    this.modulation.connect(this.thumpDepth);
    this.bedDepth.connect(this.bedGain.gain);
    this.thumpDepth.connect(this.thumpGain.gain);

    this.panner = context.createStereoPanner();
    this.panner.pan.value = pan;
    this.bedGain.connect(this.panner);
    this.thumpGain.connect(this.panner);
    this.panner.connect(output);

    this.bed.start();
    this.thump.start();
    this.modulation.start();
    this.reset();
  }

  update(state: TrackSideState) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const smoothing = this.definition.smoothing;
    const tuning = this.definition.tracks;
    const rate = Math.max(0.7, Math.min(tuning.maxRate, state.rate));
    const level = Math.max(0, Math.min(1, state.level));
    this.modulation.frequency.setTargetAtTime(rate, now, smoothing);
    this.bedFilter.frequency.setTargetAtTime(tuning.filterHz + rate * 22, now, smoothing);
    this.thump.frequency.setTargetAtTime(32 + rate * 2.4, now, smoothing);
    this.bedGain.gain.setTargetAtTime(level * tuning.bedGain * 0.55, now, smoothing);
    this.bedDepth.gain.setTargetAtTime(level * tuning.bedGain * 0.45, now, smoothing);
    this.thumpGain.gain.setTargetAtTime(level * tuning.thumpGain * 0.5, now, smoothing);
    this.thumpDepth.gain.setTargetAtTime(level * tuning.thumpGain * 0.5, now, smoothing);
  }

  reset() { this.update({ rate: 0, level: 0 }); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.bed.stop();
    this.thump.stop();
    this.modulation.stop();
    this.bed.disconnect();
    this.bedFilter.disconnect();
    this.bedGain.disconnect();
    this.thump.disconnect();
    this.thumpFilter.disconnect();
    this.thumpGain.disconnect();
    this.modulation.disconnect();
    this.bedDepth.disconnect();
    this.thumpDepth.disconnect();
    this.panner.disconnect();
  }
}

export class TrackAudio {
  private readonly left: TrackSide;
  private readonly right: TrackSide;
  constructor(context: BaseAudioContext, output: AudioNode, definition: Readonly<AudioDefinition>, noiseBuffer: AudioBuffer) {
    this.left = new TrackSide(context, output, definition, noiseBuffer, -definition.tracks.pan);
    this.right = new TrackSide(context, output, definition, noiseBuffer, definition.tracks.pan);
  }
  update(left: TrackSideState, right: TrackSideState) {
    this.left.update(left);
    this.right.update(right);
  }
  reset() { this.left.reset(); this.right.reset(); }
  dispose() { this.left.dispose(); this.right.dispose(); }
}
