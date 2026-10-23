import type { Engine } from '@babylonjs/core';
import { releasedKeys, type DriveKeys } from '../input/DriveInput.ts';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';

/** Opt-in local development observation, absent from the ordinary player flow. */
export class DrivingObservation {
  private active = false;
  private elapsed = 0;
  private frames: number[] = [];
  private physicsSteps = 0;
  private resets = 0;
  private invalid = 0;
  private samples: unknown[] = [];
  private nextSample = 0;
  private lastCycle = -1;
  private started = '';
  private output = document.createElement('pre');
  private button = document.createElement('button');
  private panel = document.createElement('section');
  private context: object;
  constructor(engine: Engine, privateReset: () => void) {
    this.resetVehicle = privateReset;
    this.context = { userAgent: navigator.userAgent, platform: navigator.platform,
      renderer: engine.getGlInfo(), resolution: [engine.getRenderWidth(), engine.getRenderHeight()],
      pixelRatio: window.devicePixelRatio, quality: 'WebGL, 2048 PCF shadows, native canvas size, track dust checkbox setting' };
    this.panel.id = 'drive-observation';
    this.panel.style.cssText = 'position:absolute;right:12px;top:12px;width:340px;max-height:50vh;overflow:auto;background:#202823ed;padding:12px;font-size:11px;color:#eee';
    this.button.textContent = '10 dakika gözlemi başlat';
    this.button.onclick = () => {
      this.active = true; this.elapsed = 0; this.frames = []; this.physicsSteps = 0; this.resets = 0;
      this.invalid = 0; this.samples = []; this.nextSample = 0; this.lastCycle = -1;
      this.started = new Date().toISOString(); this.button.disabled = true;
      this.output.textContent = 'Otomatik gerçek zamanlı sürüş gözlemi başladı.';
    };
    this.panel.append(this.button, this.output); document.body.append(this.panel);
  }
  private resetVehicle: () => void;
  keys(): DriveKeys | undefined {
    if (!this.active) return undefined;
    const cycle = Math.floor(this.elapsed / 60), t = this.elapsed % 60;
    if (cycle !== this.lastCycle) { this.resetVehicle(); this.resets++; this.lastCycle = cycle; }
    const keys = releasedKeys();
    if (t < 6) keys.forward = true;
    else if (t < 10) { keys.forward = true; keys.right = true; }
    else if (t < 13) keys.brake = true;
    else if (t < 18) keys.reverse = true;
    else if (t < 22) keys.left = true;
    else if (t < 34) { keys.forward = true; keys.left = true; }
    else if (t < 36) keys.brake = true;
    else if (t < 44) { keys.forward = true; keys.right = true; }
    else if (t < 50) keys.forward = true;
    else if (t < 53) keys.brake = true;
    return keys;
  }
  step() { if (this.active) this.physicsSteps++; }
  frame(dt: number, vehicle: TankVehicle) {
    if (!this.active) return;
    this.elapsed += dt; this.frames.push(dt * 1000);
    if (![...vehicle.node.position.asArray(), vehicle.speed].every(Number.isFinite)) this.invalid++;
    if (this.elapsed >= this.nextSample) {
      this.samples.push({ seconds: Math.round(this.elapsed), position: vehicle.node.position.asArray(),
        speed: vehicle.speed, contacts: vehicle.contacts.filter(c => c.grounded).length,
        roll: vehicle.current.rotation.toEulerAngles().z });
      this.nextSample += 10;
      this.output.textContent = JSON.stringify(this.report(false), null, 2);
    }
    if (this.elapsed >= 600) {
      this.active = false; this.resetVehicle(); this.button.disabled = false;
      this.output.textContent = JSON.stringify(this.report(true), null, 2);
      const download = document.createElement('button'); download.textContent = 'Gözlem kaydını indir';
      download.onclick = () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(this.report(true), null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'driving-browser-observation.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      this.panel.append(download);
    }
  }
  private report(complete: boolean) {
    const sorted = [...this.frames].sort((a, b) => a - b);
    const percentile = (p: number) => sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
    return { complete, started: this.started, seconds: this.elapsed, frames: this.frames.length,
      averageFPS: this.frames.length / Math.max(0.001, this.elapsed), p50ms: percentile(0.5), p95ms: percentile(0.95),
      p99ms: percentile(0.99), maxFrameMs: sorted.at(-1), framesOver50ms: this.frames.filter(t => t > 50).length,
      physicsSteps: this.physicsSteps, resets: this.resets, nonFiniteFrames: this.invalid,
      context: this.context, samples: this.samples };
  }
  dispose() { this.panel.remove(); }
}
