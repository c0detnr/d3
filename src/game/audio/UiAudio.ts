import { createNoiseBuffer } from './proceduralAudio.ts';

interface UiVoice {
  nodes: AudioNode[];
  stop?: () => void;
}

export class UiAudio {
  private readonly context: BaseAudioContext;
  private readonly output: AudioNode;
  private readonly noise: AudioBuffer;
  private readonly voices: UiVoice[] = [];
  private disposed = false;
  readonly capacity = 10;

  get activeVoices() {
    return this.voices.length;
  }

  constructor(context: BaseAudioContext, output: AudioNode) {
    this.context = context;
    this.output = output;
    this.noise = createNoiseBuffer(context, 0.5, 31415);
  }

  private addVoice(nodes: AudioNode[], stop?: () => void) {
    if (this.disposed) return;
    if (this.voices.length >= this.capacity) {
      this.release(this.voices[0]);
    }
    const voice: UiVoice = { nodes, stop };
    this.voices.push(voice);
    return voice;
  }

  private release(voice: UiVoice) {
    const index = this.voices.indexOf(voice);
    if (index < 0) return;
    this.voices.splice(index, 1);
    try {
      voice.stop?.();
    } catch {
      /* already stopped */
    }
    for (const node of voice.nodes) {
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }

  hover() {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.016);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc.connect(gain);
    gain.connect(this.output);

    const voice = this.addVoice([osc, gain], () => osc.stop());
    osc.onended = () => { if (voice) this.release(voice); };
    osc.start(now);
    osc.stop(now + 0.02);
  }

  click() {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;

    // Tonal body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.035);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(0.12, now + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    osc.connect(oscGain);
    oscGain.connect(this.output);

    // Tactile click transient
    const noise = ctx.createBufferSource();
    noise.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2800;
    filter.Q.value = 2.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.output);

    const voice = this.addVoice([osc, oscGain, noise, filter, noiseGain], () => {
      osc.stop();
      noise.stop();
    });
    osc.onended = () => { if (voice) this.release(voice); };
    osc.start(now);
    osc.stop(now + 0.04);
    noise.start(now);
    noise.stop(now + 0.03);
  }

  back() {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.045);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(0.14, now + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    osc.connect(oscGain);
    oscGain.connect(this.output);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.09, now + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.output);

    const voice = this.addVoice([osc, oscGain, noise, filter, noiseGain], () => {
      osc.stop();
      noise.stop();
    });
    osc.onended = () => { if (voice) this.release(voice); };
    osc.start(now);
    osc.stop(now + 0.05);
    noise.start(now);
    noise.stop(now + 0.04);
  }

  toggle() {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(520, now);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.11, now + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
    osc1.connect(gain1);
    gain1.connect(this.output);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(780, now + 0.025);
    gain2.gain.setValueAtTime(0.0001, now + 0.025);
    gain2.gain.linearRampToValueAtTime(0.13, now + 0.028);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    osc2.connect(gain2);
    gain2.connect(this.output);

    const voice = this.addVoice([osc1, gain1, osc2, gain2], () => {
      osc1.stop();
      osc2.stop();
    });
    osc2.onended = () => { if (voice) this.release(voice); };
    osc1.start(now);
    osc1.stop(now + 0.03);
    osc2.start(now + 0.025);
    osc2.stop(now + 0.07);
  }

  reject() {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;

    // Low muffled double-thud
    const osc1 = ctx.createOscillator();
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.value = 220;
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.exponentialRampToValueAtTime(50, now + 0.06);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.004);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.output);

    const osc2 = ctx.createOscillator();
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 180;
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(90, now + 0.065);
    osc2.frequency.exponentialRampToValueAtTime(45, now + 0.14);
    gain2.gain.setValueAtTime(0.0001, now + 0.065);
    gain2.gain.linearRampToValueAtTime(0.20, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.output);

    const voice = this.addVoice([osc1, filter1, gain1, osc2, filter2, gain2], () => {
      osc1.stop();
      osc2.stop();
    });
    osc2.onended = () => { if (voice) this.release(voice); };
    osc1.start(now);
    osc1.stop(now + 0.065);
    osc2.start(now + 0.065);
    osc2.stop(now + 0.15);
  }

  reset() {
    for (const voice of [...this.voices]) {
      this.release(voice);
    }
  }

  dispose() {
    this.reset();
    this.disposed = true;
  }
}
