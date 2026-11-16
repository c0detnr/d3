import { createCannonBlast } from './cannonBlast.ts';
import { createNoiseBuffer } from './proceduralAudio.ts';
import { createImpactSound, IMPACT_SOUND_KINDS, type ImpactSoundKind } from './impactSound.ts';
import { CANNON_AUDIO, COMBAT_AUDIO_DISTANCE, combatDistanceCue, type TankAudioId } from './AudioDefinition.ts';
import type { ImpactSurface } from '../combat/ImpactSurface.ts';

interface Voice { source: AudioBufferSourceNode | OscillatorNode; nodes: AudioNode[]; gain: GainNode; shot: boolean }
const TANK_IDS = Object.keys(CANNON_AUDIO) as TankAudioId[];
/** Bounded procedural one-shots through the existing master/limiter. No timers or new context.
 * Cannon and impact buffers are generated once; playback only creates a short node chain. */
export class CombatAudio {
  private readonly context: BaseAudioContext;
  private readonly output: AudioNode;
  private readonly noise: AudioBuffer;
  private readonly blasts: Record<TankAudioId, AudioBuffer[]>;
  private readonly impacts: Record<ImpactSoundKind, AudioBuffer>;
  private shotIndex = 0;
  private readonly voices: Voice[] = [];
  private disposed = false;
  readonly capacity = 12;
  get activeVoices() { return this.voices.length; }
  get activeShots() { return this.voices.filter(voice => voice.shot).length; }
  constructor(context: BaseAudioContext, output: AudioNode) {
    this.context = context; this.output = output;
    this.noise = createNoiseBuffer(context, 1, 7153);
    this.blasts = Object.fromEntries(TANK_IDS.map(id =>
      [id, [7153, 9401].map(seed => createCannonBlast(context, seed + Number(id) * 31, CANNON_AUDIO[id]))])) as Record<TankAudioId, AudioBuffer[]>;
    this.impacts = Object.fromEntries(IMPACT_SOUND_KINDS.map((kind, index) =>
      [kind, createImpactSound(context, kind, 4242 + index * 977)])) as Record<ImpactSoundKind, AudioBuffer>;
  }
  private tone(frequency: number, seconds: number, level: number, noise: boolean, pan = 0) {
    if (this.disposed) return;
    if (this.voices.length >= this.capacity) this.steal(this.voices[0]);
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
    const voice: Voice = { source, nodes: [filter, gain, panner], gain, shot: false }; this.voices.push(voice);
    source.onended = () => this.release(voice);
    source.start(now); source.stop(now + seconds + 0.02);
  }
  /** Distance-aware buffer playback: speed-of-sound delay, air absorption lowpass, attenuation, stereo pan. */
  private play(buffer: AudioBuffer, level: number, distance: number, stereo: number, shot: boolean) {
    if (this.disposed) return;
    if (shot) {
      const shots = this.voices.filter(voice => voice.shot);
      if (shots.length >= COMBAT_AUDIO_DISTANCE.maxShots) this.steal(shots[0]);
    }
    if (this.voices.length >= this.capacity) this.steal(this.voices[0]);
    const ctx = this.context, now = ctx.currentTime, cue = combatDistanceCue(distance);
    const source = ctx.createBufferSource(); source.buffer = buffer;
    const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 24; highpass.Q.value = 0.7;
    const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = cue.cutoff; lowpass.Q.value = 0.5;
    const gain = ctx.createGain(); gain.gain.value = level * cue.attenuation;
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, Number.isFinite(stereo) ? stereo : 0));
    source.connect(highpass); highpass.connect(lowpass); lowpass.connect(gain); gain.connect(pan); pan.connect(this.output);
    const voice: Voice = { source, nodes: [highpass, lowpass, gain, pan], gain, shot }; this.voices.push(voice);
    source.onended = () => this.release(voice);
    const start = now + cue.delay;
    source.start(start); source.stop(start + buffer.length / buffer.sampleRate);
  }
  /** Cannon report of the firing tank's profile. `distance` from the listener in metres; 0 = own shot. */
  shot(tank: TankAudioId = '01', distance = 0, stereo = 0) {
    const variations = this.blasts[tank] ?? this.blasts['01'];
    this.play(variations[this.shotIndex++ % variations.length], CANNON_AUDIO[tank]?.level ?? 1, distance, stereo, true);
  }
  machineGunShot() { this.tone(2400, 0.065, 0.24, true); this.tone(160, 0.07, 0.12, false); }
  reload() { this.tone(1600, 0.085, 0.13, true); this.tone(320, 0.12, 0.16, true); }
  impact(surface: ImpactSurface, distance: number, pan: number) {
    this.play(this.impacts[surface], surface === 'soil' ? 0.7 : 0.62, distance, pan, false);
  }
  armorHit(penetrated: boolean, distance: number, pan: number, destroyed = false) {
    this.play(this.impacts[penetrated ? 'penetration' : 'ricochet'], penetrated ? 0.75 : 0.6, distance, pan, false);
    if (destroyed) this.play(this.impacts.destruction, 0.9, distance, pan, false);
  }
  damageAmbience(hp: number, engineIntegrity: number, distance: number, pan: number) {
    const level = 1 / (1 + Math.max(0, distance) / 24);
    if (hp <= 25) this.tone(900, 0.44, (hp === 0 ? 0.12 : 0.06) * level, true, pan);
    if (hp > 0 && engineIntegrity < 100) {
      this.tone(85, 0.4, 0.045 * level, false, pan);
      this.tone(180, 0.42, 0.055 * level, true, pan);
    }
  }
  /** Removes a voice from the pool with a short fade so a stolen report does not click. */
  private steal(voice: Voice) {
    const index = this.voices.indexOf(voice); if (index < 0) return;
    this.voices.splice(index, 1);
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, 0.012);
    voice.source.onended = () => this.disconnect(voice);
    try { voice.source.stop(now + 0.06); } catch { /* source may already have ended */ }
  }
  private disconnect(voice: Voice) {
    voice.source.onended = null;
    voice.source.disconnect(); voice.nodes.forEach(node => node.disconnect());
  }
  private release(voice: Voice) {
    const index = this.voices.indexOf(voice); if (index < 0) return;
    this.voices.splice(index, 1);
    try { voice.source.stop(); } catch { /* source may already have ended */ }
    this.disconnect(voice);
  }
  reset() { for (const voice of [...this.voices]) this.release(voice); }
  dispose() { this.reset(); this.disposed = true; }
}
