import { Matrix, Vector3, type Scene } from '@babylonjs/core';
import { t, type TranslationKey } from '../i18n/index.ts';
import type { MissionDirector } from '../mission/MissionDirector.ts';
import './missionHud.css';
type Speaker = 'riza' | 'defne' | 'colonel';
interface RadioLine { speaker: Speaker; text: TranslationKey }
export class MissionHud {
  readonly root = document.createElement('div');
  private readonly objective: HTMLElement;
  private readonly confirmation: HTMLElement;
  private readonly marker: HTMLElement;
  private readonly radio: HTMLElement;
  private readonly speaker: HTMLElement;
  private readonly message: HTMLElement;
  private readonly badge: HTMLElement;
  private queue: RadioLine[] = [];
  private line?: RadioLine;
  private age = 0;
  private confirmed = 0;
  constructor() {
    this.root.className = 'mission-hud';
    this.root.innerHTML = `<section class="mission-objective" aria-live="polite"><strong></strong><span class="mission-confirmation" role="status"></span></section>
      <div class="mission-waypoint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 17-8-4-8 4Z"/></svg><span></span></div>
      <aside class="mission-radio" aria-live="polite"><div class="radio-badge" aria-hidden="true"><i></i></div><div class="radio-copy"><strong></strong><p><span></span></p></div></aside>`;
    this.objective = this.root.querySelector('.mission-objective strong')!;
    this.confirmation = this.root.querySelector('.mission-confirmation')!;
    this.marker = this.root.querySelector('.mission-waypoint')!;
    this.radio = this.root.querySelector('.mission-radio')!;
    this.speaker = this.radio.querySelector('strong')!; this.message = this.radio.querySelector('p')!;
    this.badge = this.radio.querySelector('.radio-badge')!;
    document.body.append(this.root);
    this.radio.hidden = true; this.marker.hidden = true;
  }
  say(speaker: Speaker, text: TranslationKey) { this.queue.push({ speaker, text }); }
  complete() { this.confirmed = 1.7; this.confirmation.textContent = t('objectiveDone'); this.confirmation.classList.remove('confirmed'); void this.confirmation.offsetWidth; this.confirmation.classList.add('confirmed'); }
  update(dt: number, director: MissionDirector, target: Vector3 | undefined, player: Vector3, scene: Scene) {
    const step = director.step;
    this.objective.textContent = step ? `${t(step.kind === 'checkpoint' ? 'missionCheckpoint' : step.kind === 'hit' ? 'missionTargets' : step.kind === 'destroy' ? 'missionScouts' : 'missionHold')} ${Math.min(step.count, Math.floor(director.progress))}/${step.count}` : '';
    this.confirmed = Math.max(0, this.confirmed - dt); this.confirmation.hidden = this.confirmed === 0;
    if (!this.line && this.queue.length) { this.line = this.queue.shift(); this.age = 0; }
    this.radio.hidden = !this.line;
    if (this.line) {
      this.age += dt;
      this.badge.dataset.speaker = this.line.speaker;
      this.speaker.textContent = t(this.line.speaker === 'riza' ? 'radioRiza' : this.line.speaker === 'defne' ? 'radioDefne' : 'radioColonel');
      const text = t(this.line.text);
      this.message.dataset.fullText = text;
      this.message.querySelector('span')!.textContent = text.slice(0, Math.floor(this.age * 42));
      if (this.age >= text.length / 42 + 3) this.line = undefined;
    }
    const camera = scene.activeCamera;
    this.marker.hidden = !target || !camera;
    if (target && camera) {
      const w = innerWidth, h = innerHeight;
      const projected = Vector3.Project(target, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(w, h));
      const behind = Vector3.Dot(target.subtract(camera.position), camera.getForwardRay().direction) < 0;
      let dx = projected.x - w / 2, dy = projected.y - h / 2;
      if (behind) { dx = -dx; dy = -dy; }
      if (Math.abs(dx) + Math.abs(dy) < .01) dy = h / 2;
      const edge = behind || projected.x < 65 || projected.x > w - 65 || projected.y < 100 || projected.y > h - 125;
      if (edge) { const scale = Math.min((w / 2 - 65) / Math.max(.01, Math.abs(dx)), (h / 2 - 125) / Math.max(.01, Math.abs(dy))); dx *= scale; dy *= scale; }
      this.marker.dataset.labelLeft = String(w / 2 + dx > w - 220);
      this.marker.style.left = `${w / 2 + dx}px`; this.marker.style.top = `${h / 2 + dy}px`;
      this.marker.querySelector('svg')!.style.transform = `rotate(${edge ? Math.atan2(dy, dx) * 180 / Math.PI + 90 : 180}deg)`;
      this.marker.querySelector('span')!.textContent = `${Math.round(Vector3.Distance(target, player))} m`;
    }
  }
  dispose() { this.queue.length = 0; this.root.remove(); }
}
