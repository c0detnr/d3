import type { Camera, Engine, Scene } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core';
import type { AudioSystem } from '../audio/AudioSystem.ts';
import type { DriveCommand } from '../input/DriveInput.ts';
import { SHOTS, StudioCamera, type ShotName, type ShotTarget } from './StudioCamera.ts';
import './studio.css';

/** Reels output in pixels; physics still runs at 60 steps per simulated second. */
const WIDTH = 1080, HEIGHT = 1920, STEP_RATE = 60, MAX_TAKE_SECONDS = 180;
const API = '/studio-api';

export interface StepInput { command: DriveCommand; turn: number; elevation: number; align: Vector3 | undefined; fire: boolean }
interface Cut { step: number; shot: ShotName; fov: number }
/** steps: [throttle, steer, brake, turretTurn, elevation, fire, alignX?, alignY?, alignZ?] per fixed step. */
interface Take { version: 1; id: string; scene: string; created: string; steps: number[][]; cuts: Cut[] }
interface TakeSummary { id: string; scene: string; steps: number; created: string; audio: boolean }

export interface StudioHooks {
  engine: Engine; scene: Scene; target: ShotTarget; ground: (x: number, z: number) => number;
  sceneKey: string; maxZ: number; audio: AudioSystem;
  gameCamera(): Camera; freeCameraActive(): boolean;
  reset(): void; frame(dt: number): void; startLoop(): void; stopLoop(): void;
}

/**
 * Content studio: records a live take as per-step inputs, then replays it offline
 * frame by frame at 1080×1920 and pipes raw frames to ffmpeg through the dev server.
 */
export class Studio {
  readonly camera: StudioCamera;
  private mode: 'idle' | 'recording' | 'rendering' = 'idle';
  private take: Take | undefined;
  private stepIndex = 0;
  private nextCut = 0;
  private followCuts = false;
  private replayDone = false;
  private cancelRequested = false;
  private resetting = false;
  private recorder: { media: MediaRecorder; chunks: Blob[]; release(): void } | undefined;
  private readonly listeners = new AbortController();
  private readonly hooks: StudioHooks;
  private readonly panel = document.createElement('aside');
  private readonly safe = document.createElement('div');
  private readonly progress = document.createElement('div');
  private readonly ui: Record<string, HTMLElement> = {};
  get rendering() { return this.mode === 'rendering'; }

  constructor(hooks: StudioHooks) {
    this.hooks = hooks;
    this.camera = new StudioCamera(hooks.scene, hooks.target, hooks.ground, hooks.maxZ);
    document.body.classList.add('studio');
    // The 9:16 layout shrinks the canvas without a window resize event.
    hooks.engine.resize();
    this.buildPanel();
    const options = { signal: this.listeners.signal };
    window.addEventListener('keydown', this.key, options);
    void this.refreshTakes();
  }

  /** Called once per fixed step before physics; records or substitutes the player's input. */
  step(input: StepInput): StepInput {
    if (this.mode === 'recording' && this.take) {
      const { command, turn, elevation, align, fire } = input;
      this.take.steps.push([command.throttle, command.steer, command.brake, turn, elevation, fire ? 1 : 0,
        ...(align ? [align.x, align.y, align.z] : [])]);
      this.stepIndex++;
      if (this.take.steps.length >= MAX_TAKE_SECONDS * STEP_RATE) queueMicrotask(() => void this.stopRecording());
      return input;
    }
    if (this.mode === 'rendering' && this.take) {
      const entry = this.take.steps[this.stepIndex];
      if (!entry) { this.replayDone = true; return { command: { throttle: 0, steer: 0, brake: 1 }, turn: 0, elevation: 0, align: undefined, fire: false }; }
      this.stepIndex++;
      const [throttle, steer, brake, turn, elevation, fire, ax, ay, az] = entry;
      return { command: { throttle, steer, brake }, turn, elevation, fire: fire === 1,
        align: ax === undefined ? undefined : new Vector3(ax, ay, az) };
    }
    return input;
  }

  /** Called every rendered frame after the scene pose is final and before scene.render(). */
  update(dt: number) {
    if (this.mode === 'rendering' && this.followCuts && this.take) {
      while (this.nextCut < this.take.cuts.length && this.take.cuts[this.nextCut].step <= this.stepIndex) {
        const cut = this.take.cuts[this.nextCut++];
        this.camera.select(cut.shot, cut.fov);
      }
    }
    this.camera.update(dt);
    const { scene } = this.hooks;
    if (this.camera.shot !== 'game' && !this.hooks.freeCameraActive()) scene.activeCamera = this.camera.camera;
    else if (scene.activeCamera === this.camera.camera) scene.activeCamera = this.hooks.gameCamera();
    if (this.mode === 'recording') this.setStatus(`● KAYIT ${(this.stepIndex / STEP_RATE).toFixed(1)} s · K ile bitir`, 'rec');
  }

  /** The game's own reset (R key, recovery) breaks a take's continuity, so it ends recording. */
  gameReset() {
    if (!this.resetting && this.mode === 'recording') void this.stopRecording();
  }

  private reset() { this.resetting = true; try { this.hooks.reset(); } finally { this.resetting = false; } }

  private selectShot(shot: ShotName, fov?: number) {
    this.camera.select(shot, fov);
    if (this.mode === 'recording' && this.take) this.take.cuts.push({ step: this.stepIndex, shot, fov: this.camera.fov });
    this.panel.querySelectorAll<HTMLButtonElement>('[data-shot]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.shot === shot)));
    this.ui.fov.textContent = `${Math.round(this.camera.fov * 180 / Math.PI)}°`;
  }

  private key = (event: KeyboardEvent) => {
    if (this.mode === 'rendering') {
      if (event.code === 'Escape') this.cancelRequested = true;
      return;
    }
    if (event.repeat || (event.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const shot = (Object.keys(SHOTS) as ShotName[]).find(name => `Digit${SHOTS[name].key}` === event.code || `Key${SHOTS[name].key}` === event.code);
    if (shot) { event.preventDefault(); this.selectShot(shot); return; }
    if (event.code === 'BracketLeft' || event.code === 'BracketRight') {
      event.preventDefault();
      const fov = Math.min(1.4, Math.max(0.35, this.camera.fov + (event.code === 'BracketLeft' ? -0.05 : 0.05)));
      this.selectShot(this.camera.shot, fov);
    }
    if (event.code === 'KeyK') { event.preventDefault(); void (this.mode === 'recording' ? this.stopRecording() : this.startRecording()); }
    if (event.code === 'KeyH') { event.preventDefault(); this.panel.hidden = !this.panel.hidden; }
  };

  private startRecording() {
    if (this.mode !== 'idle') return;
    this.reset();
    this.take = { version: 1, id: takeId(), scene: this.hooks.sceneKey, created: new Date().toISOString(), steps: [],
      cuts: [{ step: 0, shot: this.camera.shot, fov: this.camera.fov }] };
    this.stepIndex = 0;
    const capture = this.hooks.audio.muted ? null : this.hooks.audio.capture();
    if (capture && typeof MediaRecorder !== 'undefined') {
      const media = new MediaRecorder(capture.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256_000 });
      const chunks: Blob[] = [];
      media.ondataavailable = event => chunks.push(event.data);
      media.start();
      this.recorder = { media, chunks, release: capture.release };
    }
    this.mode = 'recording';
    this.ui.record.textContent = 'Kaydı bitir (K)';
  }

  private async stopRecording() {
    if (this.mode !== 'recording' || !this.take) return;
    this.mode = 'idle';
    this.ui.record.textContent = 'Çekime başla (K)';
    const take = this.take;
    const recorder = this.recorder; this.recorder = undefined;
    const audio = recorder && await new Promise<Blob>(done => {
      recorder.media.onstop = () => done(new Blob(recorder.chunks, { type: 'audio/webm' }));
      recorder.media.stop();
    });
    recorder?.release();
    try {
      await put(`${API}/takes/${take.id}`, JSON.stringify(take));
      if (audio && audio.size) await put(`${API}/takes/${take.id}/audio`, audio);
      this.setStatus(`Çekim kaydedildi · ${take.id} · ${(take.steps.length / STEP_RATE).toFixed(1)} s${audio ? '' : ' · sessiz'}`);
      await this.refreshTakes(take.id);
    } catch (error) {
      this.setStatus(`Çekim kaydedilemedi: ${String(error)} · stüdyoyu "npm run studio" ile aç`, 'error');
    }
  }

  private async render() {
    if (this.mode !== 'idle') return;
    const takeId = (this.ui.take as HTMLSelectElement).value;
    if (!takeId) { this.setStatus('Önce K ile bir çekim kaydet.', 'error'); return; }
    const take = await fetch(`${API}/takes/${takeId}`).then(r => r.json()) as Take;
    if (take.scene !== this.hooks.sceneKey) {
      this.setStatus(`Bu çekim farklı sahnede kaydedildi (${take.scene || 'varsayılan'}).`, 'error'); return;
    }
    const fps = Number((this.ui.fps as HTMLSelectElement).value) as 30 | 60;
    const supersample = Number((this.ui.quality as HTMLSelectElement).value) as 1 | 2;
    const slow = Number((this.ui.slow as HTMLSelectElement).value);
    const shotMode = (this.ui.shot as HTMLSelectElement).value as ShotName | 'cuts';
    const label = [shotMode === 'cuts' ? 'kurgu' : shotMode, `${fps}fps`, ...(slow > 1 ? [`slow${slow}x`] : [])].join('-');
    const started = await fetch(`${API}/renders`, { method: 'POST', body: JSON.stringify({
      take: take.id, width: WIDTH, height: HEIGHT, supersample, fps, audio: slow === 1, label }) });
    if (!started.ok) { this.setStatus(`Render başlatılamadı: ${await started.text()}`, 'error'); return; }
    const { id } = await started.json() as { id: string };

    const { engine, audio } = this.hooks;
    const [w, h] = [WIDTH * supersample, HEIGHT * supersample];
    const frameDt = 1 / (fps * slow);
    const total = Math.ceil(take.steps.length / STEP_RATE * fps * slow);
    const previousShot = this.camera.shot, previousFov = this.camera.fov;
    const wasMuted = audio.muted;
    this.mode = 'rendering'; this.cancelRequested = false; this.replayDone = false;
    document.exitPointerLock?.();
    audio.setMuted(true);
    this.hooks.stopLoop();
    // Babylon particles and animations read engine delta; pin it to simulated time.
    const pinned = engine as Engine & { getDeltaTime(): number };
    pinned.getDeltaTime = () => frameDt * 1000;
    engine.setSize(w, h, true);
    this.progress.hidden = false;
    let frames = 0;
    let result: { file?: string; megabytes?: number; error?: string } = {};
    try {
      this.reset();
      this.take = take; this.stepIndex = 0; this.nextCut = 0;
      this.followCuts = shotMode === 'cuts';
      if (shotMode !== 'cuts') this.camera.select(shotMode);
      const pixels = new Uint8Array(w * h * 4);
      while (!this.replayDone && !this.cancelRequested) {
        engine.beginFrame();
        this.hooks.frame(frameDt);
        engine.endFrame();
        await engine.readPixels(0, 0, w, h, true, true, pixels);
        const sent = await fetch(`${API}/renders/${id}/frame`, { method: 'POST', body: pixels });
        if (!sent.ok) throw new Error(await sent.text());
        frames++;
        this.progress.textContent = `RENDER ${frames} / ${total} kare · %${Math.min(100, Math.round(frames / total * 100))} · Esc iptal`;
      }
      const end = await fetch(`${API}/renders/${id}/${this.cancelRequested ? 'cancel' : 'finish'}`, { method: 'POST' });
      result = await end.json();
    } catch (error) {
      await fetch(`${API}/renders/${id}/cancel`, { method: 'POST' }).catch(() => undefined);
      result = { error: String(error) };
    } finally {
      delete (pinned as Partial<typeof pinned>).getDeltaTime;
      this.mode = 'idle'; this.take = undefined; this.followCuts = false;
      this.progress.hidden = true;
      this.camera.select(previousShot, previousFov);
      engine.resize(true);
      audio.setMuted(wasMuted);
      this.reset();
      this.hooks.startLoop();
    }
    if (this.cancelRequested) this.setStatus(`Render iptal edildi (${frames} kare).`);
    else if (result.file) this.setStatus(`Hazır · ${frames} kare · ${result.megabytes} MB · ${result.file}`, 'ok');
    else this.setStatus(`Render başarısız: ${result.error ?? 'bilinmeyen hata'}`, 'error');
  }

  private async refreshTakes(select?: string) {
    const list = this.ui.take as HTMLSelectElement;
    try {
      const takes = await fetch(`${API}/takes`).then(r => r.json()) as TakeSummary[];
      list.replaceChildren(...takes.map(take => {
        const option = new Option(`${take.id} · ${(take.steps / STEP_RATE).toFixed(1)} s${take.audio ? '' : ' · sessiz'}${take.scene === this.hooks.sceneKey ? '' : ' · farklı sahne'}`, take.id);
        option.disabled = take.scene !== this.hooks.sceneKey;
        return option;
      }));
      if (select) list.value = select;
    } catch {
      this.setStatus('Stüdyo sunucusu yok · "npm run studio" ile aç.', 'error');
    }
  }

  private setStatus(text: string, tone: 'ok' | 'error' | 'rec' | '' = '') {
    this.ui.status.textContent = text;
    this.ui.status.dataset.tone = tone;
  }

  private buildPanel() {
    this.safe.className = 'studio-safe';
    this.safe.innerHTML = '<i class="top"></i><i class="bottom"></i><i class="side"></i>';
    this.progress.className = 'studio-progress'; this.progress.hidden = true;
    const shots = (Object.keys(SHOTS) as ShotName[]);
    this.panel.className = 'studio-ui';
    this.panel.innerHTML = `
      <h2>STÜDYO · 9:16</h2>
      <p class="studio-status" data-ui="status" role="status">Tanka tıkla ve sür. K ile çekime başla.</p>
      <section><h3>Kamera <span data-ui="fov"></span></h3>
        <div class="studio-shots">${shots.map(shot => `<button type="button" data-shot="${shot}"><kbd>${SHOTS[shot].key}</kbd>${SHOTS[shot].label}</button>`).join('')}</div>
        <label><input type="checkbox" data-ui="handheld" checked> El kamerası salınımı</label>
        <label><input type="checkbox" data-ui="safezone" checked> Reels güvenli alanı</label>
      </section>
      <section><h3>Çekim</h3><button type="button" class="studio-primary" data-ui="record">Çekime başla (K)</button></section>
      <section><h3>Render</h3>
        <select data-ui="take" aria-label="Çekim"></select>
        <select data-ui="shot" aria-label="Kamera"><option value="cuts">Çekimdeki kurgu</option>${shots.map(shot => `<option value="${shot}">${SHOTS[shot].label}</option>`).join('')}</select>
        <div class="studio-row">
          <select data-ui="fps" aria-label="Kare hızı"><option value="60">60 fps</option><option value="30">30 fps</option></select>
          <select data-ui="quality" aria-label="Kalite"><option value="2">2× süper örnekleme</option><option value="1">Doğrudan 1080p</option></select>
          <select data-ui="slow" aria-label="Hız"><option value="1">Normal hız</option><option value="2">0,5× ağır çekim</option><option value="4">0,25× ağır çekim</option></select>
        </div>
        <button type="button" class="studio-primary" data-ui="render">MP4 render al</button>
      </section>
      <p class="studio-keys"><kbd>3–9</kbd> <kbd>Y U I O P L</kbd> <kbd>C</kbd> kamera · <kbd>[</kbd><kbd>]</kbd> lens · <kbd>K</kbd> kayıt · <kbd>H</kbd> paneli gizle</p>`;
    this.panel.querySelectorAll<HTMLElement>('[data-ui]').forEach(element => { this.ui[element.dataset.ui!] = element; });
    const options = { signal: this.listeners.signal };
    this.panel.querySelectorAll<HTMLButtonElement>('[data-shot]').forEach(button =>
      button.addEventListener('click', () => this.selectShot(button.dataset.shot as ShotName), options));
    this.ui.record.addEventListener('click', () => void (this.mode === 'recording' ? this.stopRecording() : this.startRecording()), options);
    this.ui.render.addEventListener('click', () => void this.render(), options);
    this.ui.handheld.addEventListener('change', () => { this.camera.handheld = (this.ui.handheld as HTMLInputElement).checked; }, options);
    this.ui.safezone.addEventListener('change', () => { this.safe.hidden = !(this.ui.safezone as HTMLInputElement).checked; }, options);
    this.ui.take.addEventListener('focus', () => void this.refreshTakes((this.ui.take as HTMLSelectElement).value), options);
    document.body.append(this.safe, this.progress, this.panel);
    this.selectShot('chase');
  }

  dispose() {
    this.listeners.abort();
    this.recorder?.media.stop(); this.recorder?.release();
    this.panel.remove(); this.safe.remove(); this.progress.remove();
    document.body.classList.remove('studio');
    this.camera.dispose();
  }
}

function takeId() {
  return `take-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;
}
async function put(url: string, body: BodyInit) {
  const response = await fetch(url, { method: 'PUT', body });
  if (!response.ok) throw new Error(await response.text());
}
