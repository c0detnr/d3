import { createNoiseBuffer } from './proceduralAudio.ts';

interface MissionVoice {
  nodes: AudioNode[];
  stop?: () => void;
}

export class MissionAudio {
  private readonly context: BaseAudioContext;
  private readonly output: AudioNode;
  private readonly noise: AudioBuffer;
  private readonly voices: MissionVoice[] = [];
  private disposed = false;
  readonly capacity = 12;

  get activeVoices() {
    return this.voices.length;
  }

  constructor(context: BaseAudioContext, output: AudioNode) {
    this.context = context;
    this.output = output;
    this.noise = createNoiseBuffer(context, 0.5, 42424);
  }

  private addVoice(nodes: AudioNode[], stop?: () => void) {
    if (this.disposed) return;
    if (this.voices.length >= this.capacity) {
      this.release(this.voices[0]);
    }
    const voice: MissionVoice = { nodes, stop };
    this.voices.push(voice);
    return voice;
  }

  private release(voice: MissionVoice) {
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

  radioChirp(direction: 'start' | 'end' = 'start') {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;

    if (direction === 'start') {
      // Noise squelch transient
      const noise = ctx.createBufferSource();
      noise.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2200;
      filter.Q.value = 2.5;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.003);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.output);

      // Tactical radio beep
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now + 0.015);
      oscGain.gain.setValueAtTime(0.0001, now + 0.015);
      oscGain.gain.linearRampToValueAtTime(0.14, now + 0.018);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      osc.connect(oscGain);
      oscGain.connect(this.output);

      const voice = this.addVoice([noise, filter, noiseGain, osc, oscGain], () => {
        noise.stop();
        osc.stop();
      });
      osc.onended = () => { if (voice) this.release(voice); };
      noise.start(now);
      noise.stop(now + 0.03);
      osc.start(now + 0.015);
      osc.stop(now + 0.06);
    } else {
      // Roger beep then squelch tail
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, now);
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.12, now + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      osc.connect(oscGain);
      oscGain.connect(this.output);

      const noise = ctx.createBufferSource();
      noise.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 2;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now + 0.025);
      noiseGain.gain.linearRampToValueAtTime(0.10, now + 0.028);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.output);

      const voice = this.addVoice([osc, oscGain, noise, filter, noiseGain], () => {
        osc.stop();
        noise.stop();
      });
      noise.onended = () => { if (voice) this.release(voice); };
      osc.start(now);
      osc.stop(now + 0.04);
      noise.start(now + 0.025);
      noise.stop(now + 0.07);
    }
  }

  objectiveComplete() {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;

    // First resonant tone: D5 (587.3 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(this.output);

    // Second bell tone: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.07);
    gain2.gain.setValueAtTime(0.0001, now + 0.07);
    gain2.gain.linearRampToValueAtTime(0.24, now + 0.078);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(this.output);

    // Subtle overtone for sparkle
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1760.0, now + 0.07);
    gain3.gain.setValueAtTime(0.0001, now + 0.07);
    gain3.gain.linearRampToValueAtTime(0.08, now + 0.078);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc3.connect(gain3);
    gain3.connect(this.output);

    const voice = this.addVoice([osc1, gain1, osc2, gain2, osc3, gain3], () => {
      osc1.stop();
      osc2.stop();
      osc3.stop();
    });
    osc2.onended = () => { if (voice) this.release(voice); };
    osc1.start(now);
    osc1.stop(now + 0.18);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.45);
    osc3.start(now + 0.07);
    osc3.stop(now + 0.38);
  }

  stinger(kind: 'victory' | 'defeat') {
    if (this.disposed) return;
    const ctx = this.context, now = ctx.currentTime;

    if (kind === 'victory') {
      // 4-note ascending triumphant brass/chime fanfare: D4 -> F#4 -> A4 -> D5
      const notes = [
        { freq: 293.66, start: 0.0, duration: 0.22, level: 0.22 },
        { freq: 369.99, start: 0.18, duration: 0.22, level: 0.24 },
        { freq: 440.00, start: 0.36, duration: 0.30, level: 0.26 },
        { freq: 587.33, start: 0.58, duration: 1.50, level: 0.32 },
      ];

      const nodes: AudioNode[] = [];
      const stops: (() => void)[] = [];

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now + note.start);
        filter.frequency.exponentialRampToValueAtTime(2600, now + note.start + note.duration);

        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.linearRampToValueAtTime(note.level, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.output);

        nodes.push(osc, filter, gain);
        stops.push(() => osc.stop());
        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.05);
      }

      const lastStop = now + 0.58 + 1.55;
      const voice = this.addVoice(nodes, () => {
        for (const stop of stops) stop();
      });
      setTimeout(() => { if (voice) this.release(voice); }, (lastStop - now + 0.1) * 1000);
    } else {
      // Somber descending brass motif: F3 -> Eb3 -> D3 -> D2
      const notes = [
        { freq: 174.61, start: 0.0, duration: 0.32, level: 0.24 },
        { freq: 155.56, start: 0.26, duration: 0.32, level: 0.24 },
        { freq: 146.83, endFreq: 73.42, start: 0.52, duration: 1.40, level: 0.30 },
      ];

      const nodes: AudioNode[] = [];
      const stops: (() => void)[] = [];

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.start);
        if (note.endFreq) {
          osc.frequency.exponentialRampToValueAtTime(note.endFreq, now + note.start + note.duration);
        }

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now + note.start);
        filter.frequency.exponentialRampToValueAtTime(220, now + note.start + note.duration);

        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.linearRampToValueAtTime(note.level, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.output);

        nodes.push(osc, filter, gain);
        stops.push(() => osc.stop());
        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.05);
      }

      const lastStop = now + 0.52 + 1.45;
      const voice = this.addVoice(nodes, () => {
        for (const stop of stops) stop();
      });
      setTimeout(() => { if (voice) this.release(voice); }, (lastStop - now + 0.1) * 1000);
    }
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
