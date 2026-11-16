import { t } from '../i18n/index.ts';
import type { FpvFlight } from './FpvFlight.ts';
import './fpv.css';
import '../ui/hudTokens.css';
import { icon, keyBadge, srText } from '../ui/icons.ts';

export class FpvHud {
  readonly root = document.createElement('section');
  readonly launch = document.createElement('button');
  readonly mode = document.createElement('button');
  private readonly dock = document.createElement('div');
  private readonly values: Record<string, HTMLElement> = {};
  private readonly horizon: HTMLElement;
  private elapsed = 0;
  constructor(onLaunch: () => void, onMode: () => void) {
    this.dock.className = 'fpv-dock';
    this.launch.innerHTML = `${keyBadge('V')}${icon('drone')}`; this.launch.onclick = onLaunch;
    this.launch.setAttribute('aria-label', t('fpvLaunch')); this.launch.title = t('fpvLaunch');
    this.mode.innerHTML = `${keyBadge('B')}<span>ASSIST</span>`; this.mode.onclick = onMode;
    this.mode.title = t('fpvModeHint'); this.mode.setAttribute('aria-label', `${t('fpvModeHint')}: ASSIST`);
    this.dock.append(this.launch, this.mode); document.getElementById('game-layer')!.append(this.dock);
    this.root.className = 'fpv-osd'; this.root.hidden = true; this.root.setAttribute('aria-label', t('fpvOsd'));
    const reading = (name: Parameters<typeof icon>[0], label: string, value: string) => `<div class="fpv-reading" title="${label}">${icon(name, label)}<strong data-value="${value}"></strong></div>`;
    this.root.innerHTML = `<div class="fpv-top"><div class="fpv-reading">${icon('drone', 'FPV')}<strong data-value="mode">ASSIST</strong></div><div class="fpv-link" title="${t('fpvLink')}">${icon('signal', t('fpvLink'))}<strong data-value="signal">100</strong><span class="fpv-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div></div>
      <div class="fpv-warning" data-value="warning" role="status"></div>
      <div class="fpv-crosshair" aria-hidden="true"></div><div class="fpv-horizon" aria-hidden="true"><i></i><span></span><i></i></div>
      <div class="fpv-readings fpv-left">${reading('speed', t('fpvSpeed'), 'speed')}${reading('altitude', t('fpvHeight'), 'height')}</div>
      <div class="fpv-readings fpv-right">${reading('home', t('fpvDistance'), 'distance')}${reading('throttle', t('fpvThrottle'), 'throttle')}</div>
      <div class="fpv-bottom"><div class="fpv-reading" title="${t('fpvBattery')}">${icon('battery', t('fpvBattery'))}<strong data-value="battery"></strong></div><div class="fpv-timer fpv-reading" title="${t('fpvTime')}">${icon('clock', t('fpvTime'))}<strong data-value="time"></strong></div></div>
      <div class="fpv-help" data-value="help" hidden></div>`;
    this.root.querySelectorAll<HTMLElement>('[data-value]').forEach(e => this.values[e.dataset.value!] = e);
    this.horizon = this.root.querySelector('.fpv-horizon')!;
    document.getElementById('game-layer')!.append(this.root);
  }
  show(flight: FpvFlight) {
    this.root.hidden = !flight.active; this.dock.hidden = flight.active;
    document.body.classList.toggle('fpv-active', flight.active);
    this.values.mode.textContent = flight.mode;
    this.values.help.textContent = flight.mode === 'ASSIST' ? t('fpvAssistHelp') : t('fpvAcroHelp');
    this.mode.innerHTML = `${keyBadge('B')}<span>${flight.mode}</span>`;
    this.mode.setAttribute('aria-label', `${t('fpvModeHint')}: ${flight.mode}`);
  }
  update(dt: number, flight: FpvFlight, height: number, distance: number, tankAlive: boolean, locked: boolean) {
    this.horizon.style.transform = `translate(-50%, calc(-50% + ${Math.max(-100, Math.min(100, flight.pitch * 90))}px)) rotate(${flight.roll}rad)`;
    this.elapsed += dt; if (this.elapsed < .1) return; this.elapsed = 0;
    this.values.speed.textContent = `${Math.hypot(flight.velocity.x, flight.velocity.z) * 3.6 | 0} ${t('kmh')}`;
    this.values.height.textContent = `${height.toFixed(1)} m`;
    this.values.distance.textContent = `${distance.toFixed(0)} m`;
    this.values.throttle.textContent = `${Math.round(flight.throttle * 100)} %`;
    this.values.battery.textContent = `${flight.voltage.toFixed(1)} V · ${flight.batteryPercent} %`;
    this.values.time.textContent = `${Math.floor(flight.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(flight.elapsed % 60).toString().padStart(2, '0')}`;
    const quality = flight.signalQuality;
    this.values.signal.textContent = `${Math.round(quality*100)}`;
    this.root.dataset.signal = quality === 0 ? 'lost' : quality < .35 ? 'poor' : quality < 1 ? 'weak' : 'good';
    this.root.querySelectorAll<HTMLElement>('.fpv-bars i').forEach((bar,i) => { bar.style.opacity = quality > i/4 ? '1' : '.15'; });
    void locked; // pointer-lock entry is shown by the shared GamePointerLock prompt
    const warning = flight.controlLost || quality === 0 ? 'lost' : quality < .35 ? 'weak' : quality < 1 ? 'jam' : !tankAlive ? 'last' : '';
    if (this.values.warning.dataset.kind !== warning) {
      this.values.warning.dataset.kind = warning;
      const text = warning === 'lost' ? t('fpvSignalLost') : warning === 'weak' ? t('fpvWeak') : warning === 'jam' ? t('fpvJamming') : warning === 'last' ? t('fpvLastFlight') : '';
      const glyph = warning === 'lost' || warning === 'weak' ? icon('signalOff') : warning === 'jam' ? icon('jam') : warning === 'last' ? `${icon('home')}${icon('destroyed')}` : '';
      this.values.warning.innerHTML = glyph ? `<span class="hud-chip">${glyph}</span>${srText(text)}` : '';
      this.values.warning.title = text;
    }
  }
  available(ready: boolean) { this.dock.hidden = !ready; }
  dispose() { document.body.classList.remove('fpv-active'); this.root.remove(); this.dock.remove(); }
}
