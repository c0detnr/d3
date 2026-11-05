import { createNoiseBuffer } from './proceduralAudio.ts';

export const smokeAudioEvents = new EventTarget();
export function smokeSound(kind: 'launch' | 'burst' | 'pickup') { smokeAudioEvents.dispatchEvent(new Event(kind)); }

/** Shares the game's master bus, mute, suspension and capture; never opens a second context. */
export class SmokeAudio {
  private readonly noise: AudioBuffer;
  private readonly voices = new Set<() => void>();
  private readonly abort = new AbortController();
  constructor(context: AudioContext, output: AudioNode) {
    this.noise = createNoiseBuffer(context, .4, 4729);
    for (const kind of ['launch', 'burst', 'pickup']) smokeAudioEvents.addEventListener(kind, () => {
      if (context.state !== 'running' || this.voices.size >= 8 || (typeof document !== 'undefined' && document.hidden)) return;
      const pickup = kind === 'pickup', now = context.currentTime, duration = pickup ? .18 : kind === 'launch' ? .16 : .3;
      const source = pickup ? context.createOscillator() : context.createBufferSource();
      if ('buffer' in source) source.buffer = this.noise;
      else { source.frequency.setValueAtTime(660, now); source.frequency.linearRampToValueAtTime(990, now + duration); }
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = pickup ? 1600 : 750;
      const gain = context.createGain(); gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(pickup ? .12 : .25, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(filter); filter.connect(gain); gain.connect(output);
      const release = () => {
        source.onended = null;
        try { source.stop(); } catch { /* already ended */ }
        source.disconnect(); filter.disconnect(); gain.disconnect(); this.voices.delete(release);
      };
      this.voices.add(release); source.onended = release;
      source.start(now); source.stop(now + duration);
    }, { signal: this.abort.signal });
  }
  reset() { for (const release of this.voices) release(); }
  dispose() { this.abort.abort(); this.reset(); }
}
