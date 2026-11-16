import { IRON_DUST_AUDIO, type AudioDefinition } from './AudioDefinition.ts';
import { AmbienceAudio } from './AmbienceAudio.ts';
import { EngineAudio } from './EngineAudio.ts';
import { TrackAudio } from './TrackAudio.ts';
import { VehicleAudioModel, type VehicleAudioSnapshot, type VehicleAudioState } from './VehicleAudioModel.ts';
import { createNoiseBuffer } from './proceduralAudio.ts';

export class VehicleAudio {
  readonly model: VehicleAudioModel;
  private readonly engine: EngineAudio;
  private readonly tracks: TrackAudio;
  private readonly ambience: AmbienceAudio;
  private accumulator = 1;
  private disposed = false;

  constructor(context: BaseAudioContext, output: AudioNode, definition: Readonly<AudioDefinition> = IRON_DUST_AUDIO) {
    this.model = new VehicleAudioModel(definition);
    const noise = createNoiseBuffer(context, 2, 1917);
    this.engine = new EngineAudio(context, output, definition, noise);
    this.tracks = new TrackAudio(context, output, definition, noise);
    this.ambience = new AmbienceAudio(context, output, definition, noise);
  }

  update(snapshot: VehicleAudioSnapshot, dt: number) {
    if (this.disposed) return;
    this.accumulator += Math.max(0, Math.min(dt, 0.25));
    if (this.accumulator < 1 / 15) return;
    this.accumulator %= 1 / 15;
    this.apply(this.model.update(snapshot));
  }

  /** Weather ambience: wind gain factor and rain level (WeatherEffects.audio). */
  setWeather(weather: { wind: number; rain: number }) { if (!this.disposed) this.ambience.setWeather(weather); }

  reset() {
    this.accumulator = 0;
    this.apply(this.model.reset());
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.engine.dispose();
    this.tracks.dispose();
    this.ambience.dispose();
  }

  private apply(state: VehicleAudioState) {
    this.engine.update(state.engineRpm, state.engineLoad);
    this.tracks.update(state.trackLeft, state.trackRight);
    this.ambience.update(state.windLevel);
  }
}
