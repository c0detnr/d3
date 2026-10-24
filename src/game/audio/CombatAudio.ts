import { createNoiseBuffer } from './proceduralAudio.ts';
import { IMPACT_FEEDBACK, type ImpactSurface } from '../combat/ImpactSurface.ts';

interface Voice { source: AudioBufferSourceNode | OscillatorNode; filter: BiquadFilterNode; gain: GainNode; pan: StereoPannerNode }
/** Bounded procedural one-shots through the existing master/limiter. No timers or new context. */
export class CombatAudio {
  private readonly context: BaseAudioContext;
  private readonly output: AudioNode;
  private readonly noise: AudioBuffer;
  private readonly voices: Voice[] = [];
  private disposed = false;
  readonly capacity = 12;
  get activeVoices() { return this.voices.length; }
  constructor(context: BaseAudioContext, output: AudioNode) {
    this.context = context; this.output = output;
    this.noise = createNoiseBuffer(context, 1, 7153);
  }
  private tone(frequency: number, seconds: number, level: number, noise: boolean, pan = 0) {
    if (this.disposed) return;
    if (this.voices.length >= this.capacity) this.release(this.voices[0]);
    const ctx = this.context, now = ctx.currentTime;
    const source = noise ? ctx.createBufferSource() : ctx.createOscillator();
    if ('buffer' in source) source.buffer = this.noise;
    else { source.type = 'sine'; source.frequency.setValueAtTime(frequency, now); source.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.3), now + seconds); }
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = frequency;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    const panner = ctx.createStereoPanner(); panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(this.output);
    const voice = { source, filter, gain, pan: panner }; this.voices.push(voice);
    source.onended = () => this.release(voice);
    source.start(now); source.stop(now + seconds + 0.02);
  }
  shot() {
    this.tone(1900, 0.34, 0.65, true);
    this.tone(95, 0.45, 0.5, false);
    this.tone(800, 0.12, 0.13, true);
  }
  reload() { this.tone(1300, 0.14, 0.16, true); this.tone(430, 0.1, 0.08, false); }
  impact(surface: ImpactSurface, distance: number, pan: number) {
    const feedback = IMPACT_FEEDBACK[surface];
    const attenuation = 1 / (1 + Math.max(0, distance) / 45);
    this.tone(feedback.frequency, feedback.duration, 0.45 * attenuation, true, pan);
    if (surface === 'metal') this.tone(2200, 0.25, 0.12 * attenuation, false, pan);
  }
  private release(voice: Voice) {
    const index = this.voices.indexOf(voice); if (index < 0) return;
    this.voices.splice(index, 1); voice.source.onended = null;
    try { voice.source.stop(); } catch { /* source may already have ended */ }
    voice.source.disconnect(); voice.filter.disconnect(); voice.gain.disconnect(); voice.pan.disconnect();
  }
  reset() { for (const voice of [...this.voices]) this.release(voice); }
  dispose() { this.reset(); this.disposed = true; }
}
