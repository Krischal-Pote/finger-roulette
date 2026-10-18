// Generates the small WAV sound effects used by the game.
// Run with: node scripts/generate-sounds.js
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

/** Simple attack/decay envelope over a note of `length` seconds. */
function envelope(i, length, sampleRate, attack = 0.005, decay = 3) {
  const t = i / sampleRate;
  const attackGain = Math.min(1, t / attack);
  const decayGain = Math.exp((-decay * t) / length);
  return attackGain * decayGain;
}

function silence(seconds) {
  return new Float32Array(Math.round(seconds * SAMPLE_RATE));
}

/** Adds a sine tone to `buf` starting at `startSample`. */
function addTone(buf, startSample, freq, seconds, gain, decay = 3, harmonics = []) {
  const length = seconds;
  const n = Math.round(seconds * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    const idx = startSample + i;
    if (idx >= buf.length) break;
    const env = envelope(i, length, SAMPLE_RATE, 0.004, decay);
    let s = Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE));
    for (const [mult, amp] of harmonics) {
      s += amp * Math.sin(2 * Math.PI * freq * mult * (i / SAMPLE_RATE));
    }
    buf[idx] += s * env * gain;
  }
}

function writeWav(file, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buffer);
  console.log('wrote', file, `${(buffer.length / 1024).toFixed(1)} KB`);
}

function makeTick() {
  const buf = new Float32Array(Math.round(0.05 * SAMPLE_RATE));
  addTone(buf, 0, 1500, 0.045, 0.5, 12, [[2, 0.2]]);
  return buf;
}

function makeSafe() {
  // Bright ascending three-note chime.
  const total = 0.32;
  const buf = new Float32Array(Math.round(total * SAMPLE_RATE));
  const notes = [660, 880, 1175];
  notes.forEach((f, i) => {
    addTone(buf, Math.round((i * 0.07) * SAMPLE_RATE), f, 0.16, 0.38, 5, [
      [2, 0.25],
      [3, 0.12],
    ]);
  });
  return buf;
}

function makePay() {
  // Lower, descending "uh oh" tone for the person who pays.
  const total = 0.55;
  const buf = new Float32Array(Math.round(total * SAMPLE_RATE));
  const notes = [392, 311, 233];
  notes.forEach((f, i) => {
    addTone(buf, Math.round((i * 0.13) * SAMPLE_RATE), f, 0.32, 0.42, 3.5, [
      [2, 0.3],
      [3, 0.15],
    ]);
  });
  return buf;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
writeWav(path.join(OUT_DIR, 'tick.wav'), makeTick());
writeWav(path.join(OUT_DIR, 'safe.wav'), makeSafe());
writeWav(path.join(OUT_DIR, 'pay.wav'), makePay());
