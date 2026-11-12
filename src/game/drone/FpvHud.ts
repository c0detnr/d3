import { t } from '../i18n/index.ts';
import type { FpvFlight } from './FpvFlight.ts';
import './fpv.css';

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
    this.launch.textContent = t('fpvLaunch'); this.launch.onclick = onLaunch;
    this.mode.textContent = 'B · ASSIST'; this.mode.onclick = onMode;
    this.mode.title = t('fpvModeHint');
    this.dock.append(this.launch, this.mode); document.getElementById('game-layer')!.append(this.dock);
    this.root.className = 'fpv-osd'; this.root.hidden = true; this.root.setAttribute('aria-label', t('fpvOsd'));
    this.root.innerHTML = `<div class="fpv-top"><div><span class="fpv-label">IRON DUST / FPV</span><strong data-value="mode">ASSIST</strong></div><div class="fpv-link"><span class="fpv-label">${t('fpvLink')}</span><strong data-value="signal">LQ 100</strong><span class="fpv-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div></div>
      <div class="fpv-warning" data-value="warning" role="status"></div>
      <div class="fpv-crosshair" aria-hidden="true"></div><div class="fpv-horizon" aria-hidden="true"><i></i><span></span><i></i></div>
      <div class="fpv-readings fpv-left"><span class="fpv-label">${t('fpvSpeed')}</span><strong data-value="speed"></strong><span class="fpv-label">${t('fpvHeight')}</span><strong data-value="height"></strong></div>
      <div class="fpv-readings fpv-right"><span class="fpv-label">${t('fpvDistance')}</span><strong data-value="distance"></strong><span class="fpv-label">${t('fpvThrottle')}</span><strong data-value="throttle"></strong></div>
      <div class="fpv-bottom"><div><span class="fpv-label">${t('fpvBattery')}</span><strong><span class="fpv-battery" aria-hidden="true"><i></i></span> <span data-value="battery"></span></strong><small>${t('fpvUnlimited')}</small></div><div class="fpv-timer"><span class="fpv-label">${t('fpvTime')}</span><strong data-value="time"></strong></div></div>
      <div class="fpv-help" data-value="help"></div>`;
    this.root.querySelectorAll<HTMLElement>('[data-value]').forEach(e => this.values[e.dataset.value!] = e);
    this.horizon = this.root.querySelector('.fpv-horizon')!;
    document.getElementById('game-layer')!.append(this.root);
  }
  show(flight: FpvFlight) {
    this.root.hidden = !flight.active; this.dock.hidden = flight.active;
    document.body.classList.toggle('fpv-active', flight.active);
    this.values.mode.textContent = flight.mode;
    this.values.help.textContent = flight.mode === 'ASSIST' ? t('fpvAssistHelp') : t('fpvAcroHelp');
    this.mode.textContent = `B · ${flight.mode}`;
  }
  update(dt: number, flight: FpvFlight, height: number, distance: number, tankAlive: boolean, locked: boolean) {
    this.horizon.style.transform = `translate(-50%, calc(-50% + ${Math.max(-100, Math.min(100, flight.pitch * 90))}px)) rotate(${flight.roll}rad)`;
    this.elapsed += dt; if (this.elapsed < .1) return; this.elapsed = 0;
    this.values.speed.textContent = `${Math.hypot(flight.velocity.x, flight.velocity.z) * 3.6 | 0} ${t('kmh')}`;
    this.values.height.textContent = `${height.toFixed(1)} m`;
    this.values.distance.textContent = `${distance.toFixed(0)} m`;
    this.values.throttle.textContent = `${Math.round(flight.throttle * 100)} %`;
    this.values.battery.textContent = `${flight.voltage.toFixed(1)} V / ${flight.batteryPercent} %`;
    this.values.time.textContent = `${Math.floor(flight.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(flight.elapsed % 60).toString().padStart(2, '0')}`;
    const quality = flight.signalQuality;
    this.values.signal.textContent = `LQ ${Math.round(quality*100)}`;
    this.root.dataset.signal = quality === 0 ? 'lost' : quality < .35 ? 'poor' : quality < 1 ? 'weak' : 'good';
    this.root.querySelectorAll<HTMLElement>('.fpv-bars i').forEach((bar,i) => { bar.style.opacity = quality > i/4 ? '1' : '.15'; });
    this.values.warning.textContent = flight.controlLost || quality === 0 ? t('fpvSignalLost') : quality < .35 ? t('fpvWeak') : quality < 1 ? t('fpvJamming') : !tankAlive ? t('fpvLastFlight') : !locked ? t('fpvClick') : '';
  }
  available(ready: boolean) { this.dock.hidden = !ready; }
  dispose() { document.body.classList.remove('fpv-active'); this.root.remove(); this.dock.remove(); }
}
