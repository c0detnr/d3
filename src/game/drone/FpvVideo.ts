import type { Scene } from '@babylonjs/core';
import type { FpvFlight } from './FpvFlight.ts';

/** Low-resolution analog receiver: at most 20 Hz, no full-resolution CPU readback. */
export function createFpvVideo(scene: Scene, source: HTMLCanvasElement, flight: FpvFlight, parent: HTMLElement) {
  const canvas = document.createElement('canvas'), snapshot = document.createElement('canvas');
  canvas.width = snapshot.width = 320; canvas.height = snapshot.height = 180;
  canvas.className = 'fpv-video'; canvas.setAttribute('aria-hidden','true'); parent.prepend(canvas);
  const ctx = canvas.getContext('2d')!, image = snapshot.getContext('2d', { willReadFrequently: true })!;
  let elapsed = 0, freeze = 0;
  const observer = scene.onAfterRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime()/1000; elapsed += dt;
    const strength = 1-flight.signalQuality;
    canvas.hidden = !flight.active || strength <= 0;
    if (canvas.hidden || elapsed < .05) return;
    const step = elapsed; elapsed = 0; freeze -= step;
    if (flight.signalQuality > 0 && freeze <= 0) {
      image.drawImage(source,0,0,320,180);
      if (strength > .4 && Math.random() < strength*.12) freeze = .12 + Math.random()*.18;
    }
    const frame = flight.signalQuality === 0 ? ctx.createImageData(320,180) : image.getImageData(0,0,320,180);
    const original = new Uint8ClampedArray(frame.data), shift = Math.ceil(strength*5);
    for (let y=0;y<180;y++) {
      const tear = Math.random() < strength*.2 ? Math.floor((Math.random()-.5)*strength*65) : 0;
      for (let x=0;x<320;x++) {
        const i=(y*320+x)*4, sx=Math.max(0,Math.min(319,x+tear));
        const noise=Math.random()*255, mix=flight.signalQuality===0 ? 1 : strength*.65;
        for (let c=0;c<3;c++) {
          const channelX=Math.max(0,Math.min(319,sx+(c-1)*shift));
          frame.data[i+c]=original[(y*320+channelX)*4+c]*(1-mix)+noise*mix;
        }
        frame.data[i+3]=255;
        if (y%4===0) for (let c=0;c<3;c++) frame.data[i+c]*=.8;
      }
    }
    ctx.putImageData(frame,0,0);
  });
  return { dispose() { scene.onAfterRenderObservable.remove(observer); canvas.remove(); canvas.width=snapshot.width=0; } };
}
