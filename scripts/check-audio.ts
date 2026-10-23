import assert from 'node:assert/strict';
import { IRON_DUST_AUDIO } from '../src/game/audio/AudioDefinition.ts';
import { AudioSystem } from '../src/game/audio/AudioSystem.ts';
import { VehicleAudio } from '../src/game/audio/VehicleAudio.ts';
import { resolveVehicleAudio, VehicleAudioModel, type VehicleAudioSnapshot } from '../src/game/audio/VehicleAudioModel.ts';

const sides = [-1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1];
const contacts = (left: number, right: number, grounded = true) =>
  Array.from({ length: 12 }, (_, index) => ({
    speed: index < 6 ? left : right,
    sideSpeed: 0,
    grounded,
  }));
const snapshot = (speed: number, left: number, right: number, driveForce = 0, grounded = true): VehicleAudioSnapshot => ({
  speed, forwardSpeed: 48 / 3.6, driveForce, traction: 180000,
  contacts: contacts(left, right, grounded), sides,
});

const idle = resolveVehicleAudio(snapshot(0, 0, 0), IRON_DUST_AUDIO);
assert.equal(idle.trackLeft.rate, 0);
assert.equal(idle.trackRight.level, 0);
assert.ok(idle.engineRpm > 0 && idle.engineRpm < 0.3, 'Rölanti duyulabilir ve düşük olmalı');
assert.ok(idle.windLevel <= 0.1, 'Duruşta rüzgâr tabanı düşük olmalı');

const moving = resolveVehicleAudio(snapshot(10, 10, 10), IRON_DUST_AUDIO);
assert.equal(moving.trackLeft.rate, moving.trackRight.rate);
assert.ok(moving.trackLeft.rate > idle.trackLeft.rate);
assert.equal(moving.trackLeft.level, 1);
assert.ok(moving.engineRpm > idle.engineRpm);
assert.ok(moving.windLevel > idle.windLevel);

const reverse = resolveVehicleAudio(snapshot(-10, -10, -10), IRON_DUST_AUDIO);
assert.equal(reverse.trackLeft.rate, moving.trackLeft.rate, 'Geri sürüş aynı palet hızını üretmeli');

const pivot = resolveVehicleAudio(snapshot(0, 2, -2), IRON_DUST_AUDIO);
assert.ok(pivot.trackLeft.rate > 1 && pivot.trackRight.rate > 1, 'Yerinde dönüşte iki palet de ses üretmeli');
assert.equal(pivot.trackLeft.level, 1);
assert.equal(pivot.trackRight.level, 1);

const slow = resolveVehicleAudio(snapshot(0.2, 0.2, 0.2), IRON_DUST_AUDIO);
assert.ok(slow.trackLeft.level > 0 && slow.trackLeft.level < moving.trackLeft.level, 'Düşük hızda palet daha hafif olmalı');

const airborne = resolveVehicleAudio(snapshot(15, 15, 15, 0, false), IRON_DUST_AUDIO);
assert.equal(airborne.trackLeft.level, 0);
assert.equal(airborne.trackRight.rate, 0);
assert.ok(airborne.engineRpm > idle.engineRpm, 'Havada motor çalışmaya devam etmeli');

const extreme = resolveVehicleAudio(snapshot(1000, 1000, -1000, 1e9), IRON_DUST_AUDIO);
assert.ok(extreme.trackLeft.rate <= IRON_DUST_AUDIO.tracks.maxRate);
assert.ok(extreme.engineRpm <= 1 && extreme.engineLoad <= 1 && extreme.windLevel <= 0.6);
assert.ok(Number.isFinite(extreme.engineRpm) && Number.isFinite(extreme.trackLeft.rate));
const invalid = resolveVehicleAudio({ speed: NaN, forwardSpeed: 0, driveForce: NaN, traction: 0,
  contacts: [{ speed: NaN, sideSpeed: NaN, grounded: true }], sides: [1] }, IRON_DUST_AUDIO);
assert.ok(Number.isFinite(invalid.engineRpm) && Number.isFinite(invalid.trackRight.rate));

const model = new VehicleAudioModel(IRON_DUST_AUDIO);
model.update(snapshot(10, 10, 10));
assert.ok(model.state.trackLeft.level > 0);
model.reset();
assert.deepEqual(model.state, idle);

type Param = {
  value: number;
  setValueAtTime: (value: number, time: number) => Param;
  setTargetAtTime: (value: number, time: number, constant: number) => Param;
  linearRampToValueAtTime: (value: number, time: number) => Param;
  exponentialRampToValueAtTime: (value: number, time: number) => Param;
  cancelScheduledValues: (time: number) => Param;
};
const param = (value = 0): Param => {
  const node: Param = {
    value,
    setValueAtTime(next) { node.value = next; return node; },
    setTargetAtTime(next) { node.value = next; return node; },
    linearRampToValueAtTime(next) { node.value = next; return node; },
    exponentialRampToValueAtTime(next) { node.value = next; return node; },
    cancelScheduledValues() { return node; },
  };
  return node;
};
const fakeContext = () => {
  const counters = { created: 0, disconnects: 0, suspends: 0, resumes: 0, closed: false };
  const node = (extra: Record<string, unknown> = {}) => {
    const value = {
      connect: () => value,
      disconnect: () => { counters.disconnects++; },
      ...extra,
    };
    return value;
  };
  const context = {
    sampleRate: 48000,
    currentTime: 0,
    state: 'running',
    destination: node(),
    createGain() { counters.created++; return node({ gain: param() }); },
    createDynamicsCompressor() {
      counters.created++;
      return node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
    },
    createOscillator() {
      counters.created++;
      return node({ type: 'sine', frequency: param(), detune: param(), start() {}, stop() {} });
    },
    createBufferSource() {
      counters.created++;
      return node({ buffer: null, loop: false, start() {}, stop() {} });
    },
    createBiquadFilter() {
      counters.created++;
      return node({ type: 'lowpass', frequency: param(), Q: param(), gain: param() });
    },
    createStereoPanner() { counters.created++; return node({ pan: param() }); },
    createBuffer(_channels: number, length: number, sampleRate: number) {
      return { getChannelData: () => new Float32Array(length), length, sampleRate };
    },
    suspend() { counters.suspends++; context.state = 'suspended'; return Promise.resolve(); },
    resume() { counters.resumes++; context.state = 'running'; return Promise.resolve(); },
    close() { counters.closed = true; context.state = 'closed'; return Promise.resolve(); },
  };
  return { context: context as unknown as AudioContext, counters };
};

const fake = fakeContext();
const system = new AudioSystem({ contextFactory: () => fake.context, volume: 0.5 });
assert.equal(system.ready, false, 'AudioContext ilk kullanıcı girdisine kadar oluşturulmamalı');
assert.equal(fake.counters.created, 0);
assert.equal(await system.unlock(), true);
assert.equal(system.ready, true);
assert.ok(fake.counters.created > 0);
system.setVolume(2);
assert.equal(system.volume, 1, 'Ana ses 1 ile sınırlanmalı');
system.setVolume(-1);
assert.equal(system.volume, 0, 'Ana ses 0 ile sınırlanmalı');
system.setMuted(true);
assert.ok(fake.counters.suspends > 0, 'Sessizde bağlam askıya alınmalı');
system.setMuted(false);
assert.ok(fake.counters.resumes > 0, 'Ses açılınca bağlam devam etmeli');

const graph = system.graph!;
const vehicleAudio = new VehicleAudio(graph.context, graph.output, IRON_DUST_AUDIO);
for (let index = 0; index < 90; index++) vehicleAudio.update(snapshot(10, 10, 10, 50000), 1 / 60);
vehicleAudio.reset();
vehicleAudio.dispose();
vehicleAudio.dispose();
assert.ok(fake.counters.disconnects > 0, 'Ses düğümleri bırakılmalı');
system.dispose();
system.dispose();
assert.equal(fake.counters.closed, true, 'AudioContext kapatılmalı');

console.log('Ses kontrolleri geçti: eşleme sınırları, palet hızı/yön/dönüş, hava, model sıfırlama, ses grafiği kur/kapat ve kaynak temizliği.');
