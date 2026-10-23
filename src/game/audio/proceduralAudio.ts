export function createNoiseBuffer(context: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let value = seed >>> 0;
  for (let index = 0; index < length; index++) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    data[index] = value / 2147483647 - 1;
  }
  return buffer;
}
