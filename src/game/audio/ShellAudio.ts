import { MenuMusic } from './menuMusic.ts';
import { UiAudio } from './UiAudio.ts';
import { MissionAudio } from './MissionAudio.ts';

export interface ShellAudioOptions {
  volume?: number;
  musicVolume?: number;
  muted?: boolean;
  contextFactory?: () => AudioContext;
}

const clamp01 = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;

export class ShellAudio {
  private readonly contextFactory: () => AudioContext;
  private context?: AudioContext;
  private masterGain?: GainNode;
  private musicGain?: GainNode;
  private uiGain?: GainNode;
  private missionGain?: GainNode;

  private menuMusic?: MenuMusic;
  private uiAudio?: UiAudio;
  private missionAudio?: MissionAudio;

  private currentVolume: number;
  private currentMusicVolume: number;
  private currentMuted: boolean;
  private disposed = false;
  private inMission = false;

  constructor(options: ShellAudioOptions = {}) {
    this.currentVolume = clamp01(options.volume ?? 0.7);
    this.currentMusicVolume = clamp01(options.musicVolume ?? 0.7);
    this.currentMuted = options.muted ?? false;
    this.contextFactory = options.contextFactory ?? (() => {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      return new Ctx({ latencyHint: 'interactive' });
    });
  }

  get ready() {
    return this.context !== undefined;
  }

  get volume() {
    return this.currentVolume;
  }

  get musicVolume() {
    return this.currentMusicVolume;
  }

  get muted() {
    return this.currentMuted;
  }

  get activeVoices() {
    return (this.uiAudio?.activeVoices ?? 0) + (this.missionAudio?.activeVoices ?? 0);
  }

  get musicPlaying() {
    return this.menuMusic?.isPlaying ?? false;
  }

  async unlock(): Promise<boolean> {
    if (this.disposed) return false;
    if (!this.context) {
      let ctx: AudioContext;
      try {
        ctx = this.contextFactory();
      } catch {
        return false;
      }

      const master = ctx.createGain();
      master.gain.value = this.currentMuted ? 0 : this.currentVolume;
      master.connect(ctx.destination);

      const music = ctx.createGain();
      music.gain.value = this.currentMusicVolume;
      music.connect(master);

      const ui = ctx.createGain();
      ui.gain.value = 1.0;
      ui.connect(master);

      const mission = ctx.createGain();
      mission.gain.value = 1.0;
      mission.connect(master);

      this.context = ctx;
      this.masterGain = master;
      this.musicGain = music;
      this.uiGain = ui;
      this.missionGain = mission;

      this.menuMusic = new MenuMusic(ctx, music);
      this.uiAudio = new UiAudio(ctx, ui);
      this.missionAudio = new MissionAudio(ctx, mission);
    }

    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        return false;
      }
    }
    return true;
  }

  setMasterVolume(volume: number) {
    this.currentVolume = clamp01(volume);
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    const target = this.currentMuted ? 0 : this.currentVolume;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + 0.05);
  }

  setMusicVolume(volume: number) {
    this.currentMusicVolume = clamp01(volume);
    if (!this.context || !this.musicGain) return;
    const now = this.context.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(this.currentMusicVolume, now + 0.05);
  }

  setMuted(muted: boolean) {
    this.currentMuted = muted;
    this.setMasterVolume(this.currentVolume);
  }

  playMenuMusic(fadeTime = 1.0) {
    if (this.disposed || this.inMission) return;
    if (!this.ready) {
      void this.unlock().then(ok => {
        if (ok && !this.inMission) this.menuMusic?.play(1.0, fadeTime);
      });
      return;
    }
    this.menuMusic?.play(1.0, fadeTime);
  }

  fadeMenuMusic(target = 0, fadeTime = 0.8) {
    this.menuMusic?.fade(target, fadeTime);
  }

  stopMenuMusic(fadeTime = 0.5) {
    this.menuMusic?.stop(fadeTime);
  }

  playHover() {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) return;
    this.uiAudio?.hover();
  }

  playClick() {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) {
      void this.unlock().then(() => this.uiAudio?.click());
      return;
    }
    this.uiAudio?.click();
  }

  playBack() {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) {
      void this.unlock().then(() => this.uiAudio?.back());
      return;
    }
    this.uiAudio?.back();
  }

  playToggle() {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) {
      void this.unlock().then(() => this.uiAudio?.toggle());
      return;
    }
    this.uiAudio?.toggle();
  }

  playReject() {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) {
      void this.unlock().then(() => this.uiAudio?.reject());
      return;
    }
    this.uiAudio?.reject();
  }

  playRadioChirp(direction: 'start' | 'end' = 'start') {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) return;
    this.missionAudio?.radioChirp(direction);
  }

  playObjectiveComplete() {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) return;
    this.missionAudio?.objectiveComplete();
  }

  playStinger(kind: 'victory' | 'defeat') {
    if (this.disposed || this.currentMuted || this.currentVolume <= 0) return;
    if (!this.ready) {
      void this.unlock().then(() => this.missionAudio?.stinger(kind));
      return;
    }
    this.missionAudio?.stinger(kind);
  }

  enterMission() {
    this.inMission = true;
    this.fadeMenuMusic(0, 0.6);
    this.uiAudio?.reset();
  }

  exitMission() {
    this.inMission = false;
    this.missionAudio?.reset();
    this.playMenuMusic(1.0);
  }

  async suspend() {
    if (!this.context || this.context.state !== 'running') return;
    try {
      await this.context.suspend();
    } catch {
      /* ignore */
    }
  }

  async resume() {
    if (!this.context || this.currentMuted) return;
    if (this.context.state !== 'suspended') return;
    try {
      await this.context.resume();
    } catch {
      /* ignore */
    }
  }

  reset() {
    this.uiAudio?.reset();
    this.missionAudio?.reset();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.menuMusic?.dispose();
    this.uiAudio?.dispose();
    this.missionAudio?.dispose();
    this.menuMusic = undefined;
    this.uiAudio = undefined;
    this.missionAudio = undefined;

    this.musicGain?.disconnect();
    this.uiGain?.disconnect();
    this.missionGain?.disconnect();
    this.masterGain?.disconnect();

    const ctx = this.context;
    this.context = undefined;
    if (ctx && ctx.state !== 'closed') {
      void ctx.close().catch(() => undefined);
    }
  }
}

export const shellAudio = new ShellAudio();
