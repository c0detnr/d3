import { createCannonBlast } from './cannonBlast.ts';
import { createNoiseBuffer } from './proceduralAudio.ts';
import { IMPACT_FEEDBACK, type ImpactSurface } from '../combat/ImpactSurface.ts';

interface Voice { source: AudioBufferSourceNode | OscillatorNode; filter: BiquadFilterNode; gain: GainNode; pan: StereoPannerNode }
/** Bounded procedural one-shots through the existing master/limiter. No timers or new context. */
export class CombatAudio {
  private readonly context: BaseAudioContext;
  private readonly output: AudioNode;
  private readonly noise: AudioBuffer;
  private readonly blasts: AudioBuffer[];
  private shotIndex = 0;
  private readonly voices: Voice[] = [];
  private disposed = false;
  readonly capacity = 12;
  get activeVoices() { return this.voices.length; }
  constructor(context: BaseAudioContext, output: AudioNode) {
    this.context = context; this.output = output;
    this.noise = createNoiseBuffer(context, 1, 7153);
    this.blasts = [7153, 9401, 12647].map(seed => createCannonBlast(context, seed));
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
  shot(distance = 0, stereo = 0) {
    if (this.disposed) return;
    if (this.voices.length >= this.capacity) this.release(this.voices[0]);
    const ctx = this.context, now = ctx.currentTime;
    const source = ctx.createBufferSource();
    const buffer = this.blasts[this.shotIndex++ % this.blasts.length];
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 32; filter.Q.value = 0.7;
    const gain = ctx.createGain(); gain.gain.value = 0.95 / (1 + Math.max(0, distance) / 60);
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, stereo));
    source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(this.output);
    const voice = { source, filter, gain, pan }; this.voices.push(voice);
    source.onended = () => this.release(voice);
    source.start(now); source.stop(now + buffer.length / ctx.sampleRate);
  }
  machineGunShot() { this.tone(2400, 0.065, 0.24, true); this.tone(160, 0.07, 0.12, false); }
  reload() { this.tone(1600, 0.085, 0.13, true); this.tone(320, 0.12, 0.16, true); }
  impact(surface: ImpactSurface, distance: number, pan: number) {
    const feedback = IMPACT_FEEDBACK[surface];
    const attenuation = 1 / (1 + Math.max(0, distance) / 45);
    this.tone(feedback.frequency, feedback.duration, 0.45 * attenuation, true, pan);
    if (surface === 'metal') this.tone(2200, 0.25, 0.12 * attenuation, false, pan);
  }
  armorHit(penetrated: boolean, distance: number, pan: number, destroyed = false) {
    const level = 1 / (1 + Math.max(0, distance) / 45);
    this.tone(penetrated ? 650 : 2800, penetrated ? 0.28 : 0.18, 0.55 * level, true, pan);
    this.tone(penetrated ? 95 : 1900, penetrated ? 0.32 : 0.4, 0.22 * level, false, pan);
    if (destroyed) { this.tone(220, 0.9, 0.65 * level, true, pan); this.tone(55, 0.8, 0.3 * level, false, pan); }
  }
  damageAmbience(hp: number, engineIntegrity: number, distance: number, pan: number) {
    const level = 1 / (1 + Math.max(0, distance) / 24);
    if (hp <= 25) this.tone(900, 0.44, (hp === 0 ? 0.12 : 0.06) * level, true, pan);
    if (hp > 0 && engineIntegrity < 100) {
      this.tone(85, 0.4, 0.045 * level, false, pan);
      this.tone(180, 0.42, 0.055 * level, true, pan);
    }
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
