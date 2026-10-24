/** Original procedural cannon report, generated once; seconds, Hz, normalised amplitude.
 * Crack -> pressure body -> diffuse stereo decay. No external recording or license.
 */
export function createCannonBlast(context: BaseAudioContext, seed: number): AudioBuffer {
  const seconds = 1.65, rate = context.sampleRate;
  const buffer = context.createBuffer(2, Math.ceil(rate * seconds), rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let state = (seed + channel * 7919) >>> 0;
    let low = 0, mid = 0, tail = 0, previous = 0, dc = 0;
    const lowRate = 1 - Math.exp(-2 * Math.PI * 155 / rate);
    const midRate = 1 - Math.exp(-2 * Math.PI * 2100 / rate);
    const tailRate = 1 - Math.exp(-2 * Math.PI * 650 / rate);
    for (let i = 0; i < data.length; i++) {
      const t = i / rate;
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const white = state / 2147483647.5 - 1;
      low += (white - low) * lowRate;
      mid += (white - mid) * midRate;
      tail += (white - tail) * tailRate;
      const attack = 1 - Math.exp(-t * 2200);
      const crack = (white - mid) * Math.exp(-t * 105) * 0.55;
      const pressure = low * 5.5 * Math.exp(-t * 10);
      const body = mid * 0.9 * Math.exp(-t * 19);
      // Quiet diffuse reflections; no repeated laser-like tonal echo.
      const reflected = Math.max(0, t - 0.055 - channel * 0.013);
      const reflections = t > 0.055 + channel * 0.013
        ? tail * 2.4 * (1 - Math.exp(-reflected * 38)) * Math.exp(-reflected * 4.8) : 0;
      const pulse = 0.22 * Math.sin(2 * Math.PI * 62 * t) * Math.exp(-t * 25);
      const mechanicalTime = Math.max(0, t - 0.11);
      const mechanical = t > 0.11 ? (mid - low) * 0.12 * Math.exp(-mechanicalTime * 65) : 0;
      const raw = Math.tanh((crack + pressure + body + reflections + pulse + mechanical) * attack * 1.5) * 0.86;
      // DC blocker and tapered tail avoid a click when the source stops.
      dc = raw - previous + 0.997 * dc; previous = raw;
      const fade = Math.min(1, (seconds - t) / 0.12);
      data[i] = dc * fade;
    }
  }
  // Common stereo gain retains the balance without clipping at any sample rate.
  let peak = 0;
  for (let channel = 0; channel < 2; channel++) for (const sample of buffer.getChannelData(channel)) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0.88) for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] *= 0.88 / peak;
  }
  return buffer;
}
