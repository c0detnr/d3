import type { AudioDefinition } from './AudioDefinition.ts';
import type { TrackSideState } from './VehicleAudioModel.ts';

class TrackSide {
  private readonly context: BaseAudioContext;
  private readonly definition: Readonly<AudioDefinition>;
  private readonly bed: AudioBufferSourceNode;
  private readonly bedFilter: BiquadFilterNode;
  private readonly bedGain: GainNode;
  private readonly modulation: OscillatorNode;
  private readonly modulationDepth: GainNode;
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
    this.modulation = context.createOscillator();
    this.modulation.type = 'sine';
    this.modulation.frequency.value = 0.8;
    this.modulationDepth = context.createGain();
    this.modulationDepth.gain.value = 0;
    this.modulation.connect(this.modulationDepth);
    this.modulationDepth.connect(this.bedGain.gain);
    this.bed.connect(this.bedFilter);
    this.bedFilter.connect(this.bedGain);
    this.panner = context.createStereoPanner();
    this.panner.pan.value = pan;
    this.bedGain.connect(this.panner);
    this.panner.connect(output);
    this.bed.start();
    this.modulation.start();
    this.reset();
  }

  update(state: TrackSideState) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const tuning = this.definition.tracks;
    const rate = Math.max(0.8, Math.min(tuning.maxRate, state.rate));
    const level = Math.max(0, Math.min(1, state.level));
    this.modulation.frequency.setTargetAtTime(rate, now, tuning.smoothing);
    this.bedFilter.frequency.setTargetAtTime(tuning.filterHz + rate * 12, now, tuning.smoothing);
    this.bedGain.gain.setTargetAtTime(level * tuning.bedGain * 0.72, now, tuning.smoothing);
    this.modulationDepth.gain.setTargetAtTime(level * tuning.bedGain * 0.28, now, tuning.smoothing);
  }

  reset() { this.update({ rate: 0, level: 0 }); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.bed.stop();
    this.modulation.stop();
    this.bed.disconnect();
    this.bedFilter.disconnect();
    this.bedGain.disconnect();
    this.modulation.disconnect();
    this.modulationDepth.disconnect();
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
