import type { AudioDefinition } from './AudioDefinition.ts';

export class AmbienceAudio {
  private readonly context: BaseAudioContext;
  private readonly definition: Readonly<AudioDefinition>;
  private readonly noise: AudioBufferSourceNode;
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;
  private readonly gust: OscillatorNode;
  private readonly gustDepth: GainNode;
  private readonly rain: AudioBufferSourceNode;
  private readonly rainFilter: BiquadFilterNode;
  private readonly rainGain: GainNode;
  /** Weather multipliers: wind gain factor and rain hiss level (0 … 1). */
  private weather = { wind: 1, rain: 0 };
  private level = 0.05;
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
    // Rain: the same noise, high-passed into a soft hiss; silent unless the weather has rain.
    this.rain = context.createBufferSource();
    this.rain.buffer = noiseBuffer;
    this.rain.loop = true;
    this.rainFilter = context.createBiquadFilter();
    this.rainFilter.type = 'highpass';
    this.rainFilter.frequency.value = 1700;
    this.rainFilter.Q.value = 0.3;
    this.rainGain = context.createGain();
    this.rainGain.gain.value = 0;
    this.rain.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(output);
    this.noise.start();
    this.gust.start();
    this.rain.start();
    this.reset();
  }

  setWeather(weather: { wind: number; rain: number }) {
    this.weather = { wind: Math.max(0, Math.min(3, weather.wind)), rain: Math.max(0, Math.min(1, weather.rain)) };
    this.update(this.level);
  }

  update(level: number) {
    if (this.disposed) return;
    this.level = level;
    const now = this.context.currentTime;
    const smoothing = this.definition.smoothing;
    const tuning = this.definition.wind;
    const base = (tuning.baseGain + tuning.speedGain * Math.max(0, Math.min(1, level))) * this.weather.wind;
    this.rainGain.gain.setTargetAtTime(this.weather.rain * 0.05, now, smoothing);
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
    this.rain.stop();
    this.rain.disconnect();
    this.rainFilter.disconnect();
    this.rainGain.disconnect();
    this.noise.disconnect();
    this.filter.disconnect();
    this.gain.disconnect();
    this.gust.disconnect();
    this.gustDepth.disconnect();
  }
}
