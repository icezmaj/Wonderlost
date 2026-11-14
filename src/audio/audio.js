// All sound is synthesised with WebAudio - no audio files to load or license.
// Motes play a rising pentatonic ladder, so a long chain literally sounds like
// a melody climbing. Audio starts only after the first touch (browser rule).

let ac = null;
let sfxBus = null;
let musicBus = null;
let echo = null;
let musicTimer = null;
let opts = { sfx: true, music: true, haptics: true };

// C major pentatonic across three octaves.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32];

function initAudio(settings) {
  opts = settings;
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ac = new AC();
    const master = ac.createDynamicsCompressor();
    master.connect(ac.destination);
    sfxBus = ac.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    musicBus = ac.createGain();
    musicBus.gain.value = 0.5;
    musicBus.connect(master);
    // one shared echo gives everything a soft, roomy tail
    echo = ac.createDelay(1);
    echo.delayTime.value = 0.27;
    const fb = ac.createGain();
    fb.gain.value = 0.28;
    const wet = ac.createGain();
    wet.gain.value = 0.35;
    echo.connect(fb);
    fb.connect(echo);
    echo.connect(wet);
    wet.connect(master);
  } catch (err) {
    ac = null;
  }
  applySettings(settings);
}

function applySettings(settings) {
  opts = settings;
  if (!ac) return;
  if (opts.music && !musicTimer) startMusic();
  if (!opts.music && musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

function resumeAudio() {
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

function tone(freq, { type = 'sine', dur = 0.3, gain = 0.2, attack = 0.004, slide = 0, delay = 0, bus = sfxBus, wet = false } = {}) {
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(bus);
  if (wet && echo) g.connect(echo);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.3, gain = 0.2, from = 800, to = 2400, q = 1, delay = 0 } = {}) {
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start(t0);
}

const on = () => ac && opts.sfx;

function buzz(pattern) {
  if (!opts.haptics || !navigator.vibrate) return;
  // Browsers ignore (and log) vibration before a real touch; skip it until then.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(pattern);
  } catch (err) {
    /* unsupported */
  }
}

const sfx = {
  tap() {
    if (on()) tone(880, { dur: 0.06, gain: 0.08, type: 'triangle' });
  },
  launch() {
    if (on()) {
      noise({ dur: 0.35, gain: 0.16, from: 500, to: 2600 });
      tone(330, { dur: 0.3, gain: 0.12, slide: 2.2, type: 'triangle' });
    }
    buzz(12);
  },
  mote(chain) {
    if (!on()) return;
    const i = chain <= 8 ? chain - 1 : 7 + ((chain - 8) % 5);
    tone(SCALE[Math.max(0, Math.min(SCALE.length - 1, i))], { dur: 0.28, gain: 0.11, type: 'triangle', wet: true });
  },
  lantern() {
    if (on()) {
      tone(523.25, { dur: 0.7, gain: 0.12, wet: true });
      tone(659.25, { dur: 0.7, gain: 0.1, delay: 0.05, wet: true });
      tone(783.99, { dur: 0.9, gain: 0.1, delay: 0.1, wet: true });
      noise({ dur: 0.4, gain: 0.07, from: 1500, to: 5000 });
    }
    buzz(22);
  },
  bumper(hits) {
    if (on()) {
      const f = 392 * Math.pow(1.122, Math.min(6, hits));
      tone(f, { dur: 0.6, gain: 0.16, wet: true });
      tone(f * 2.76, { dur: 0.35, gain: 0.05 });
      tone(f * 5.4, { dur: 0.18, gain: 0.03 });
    }
    buzz(16);
  },
  thud() {
    if (on()) tone(150, { dur: 0.12, gain: 0.12, slide: 0.6 });
  },
  wall() {
    if (on()) tone(210, { dur: 0.08, gain: 0.07, slide: 0.7, type: 'triangle' });
  },
  geyser() {
    if (on()) {
      noise({ dur: 0.6, gain: 0.22, from: 300, to: 4200, q: 0.7 });
      tone(220, { dur: 0.5, gain: 0.1, slide: 3 });
    }
    buzz([10, 30, 20]);
  },
  slow() {
    if (on()) tone(660, { dur: 0.25, gain: 0.07, slide: 0.5, type: 'sine' });
  },
  rekindle() {
    if (on()) {
      noise({ dur: 0.25, gain: 0.18, from: 900, to: 5200 });
      tone(440, { dur: 0.25, gain: 0.14, slide: 2.5, type: 'sawtooth' });
      tone(880, { dur: 0.4, gain: 0.08, delay: 0.05, wet: true });
    }
    buzz(28);
  },
  creature() {
    if (on()) {
      tone(988, { dur: 0.12, gain: 0.12, type: 'triangle' });
      tone(1319, { dur: 0.14, gain: 0.12, delay: 0.1, type: 'triangle' });
      tone(1568, { dur: 0.3, gain: 0.12, delay: 0.2, type: 'triangle', wet: true });
    }
    buzz([14, 40, 14]);
  },
  pet() {
    if (on()) {
      tone(1175, { dur: 0.12, gain: 0.1, type: 'triangle' });
      tone(1568, { dur: 0.22, gain: 0.1, delay: 0.09, type: 'triangle', wet: true });
    }
    buzz(10);
  },
  relic() {
    if (on()) [0, 2, 4, 7, 9].forEach((n, k) => tone(SCALE[n], { dur: 0.3, gain: 0.1, delay: k * 0.06, type: 'triangle', wet: true }));
    buzz([12, 30, 12]);
  },
  tier(t) {
    if (on()) {
      tone(SCALE[3 + t], { dur: 0.4, gain: 0.12, wet: true });
      tone(SCALE[5 + t], { dur: 0.5, gain: 0.1, delay: 0.07, wet: true });
    }
  },
  awaken() {
    if (on()) [0, 2, 4, 5, 7, 9].forEach((n, k) => tone(SCALE[n] / 2, { dur: 1.4, gain: 0.09, delay: k * 0.07, wet: true }));
    buzz([20, 40, 20, 40, 40]);
  },
  home() {
    if (on()) {
      [0, 2, 4, 5].forEach((n, k) => tone(SCALE[n], { dur: 0.5, gain: 0.13, delay: k * 0.09, type: 'triangle', wet: true }));
      tone(SCALE[7], { dur: 1, gain: 0.13, delay: 0.38, wet: true });
    }
    buzz([20, 30, 50]);
  },
  mist() {
    if (on()) {
      tone(392, { dur: 0.5, gain: 0.09, slide: 0.5 });
      noise({ dur: 0.5, gain: 0.06, from: 1200, to: 300 });
    }
  },
  count() {
    if (on()) tone(1318, { dur: 0.05, gain: 0.05, type: 'triangle' });
  },
  reveal() {
    if (on()) [2, 4, 7].forEach((n, k) => tone(SCALE[n], { dur: 0.5, gain: 0.11, delay: k * 0.08, type: 'triangle', wet: true }));
  },
  build() {
    if (on()) {
      tone(180, { dur: 0.1, gain: 0.16, slide: 0.6 });
      tone(180, { dur: 0.1, gain: 0.16, slide: 0.6, delay: 0.14 });
      [0, 2, 4, 7].forEach((n, k) => tone(SCALE[n], { dur: 0.6, gain: 0.1, delay: 0.3 + k * 0.07, wet: true }));
    }
    buzz([14, 60, 14, 60, 30]);
  },
  claim() {
    if (on()) {
      tone(SCALE[4], { dur: 0.2, gain: 0.11, type: 'triangle' });
      tone(SCALE[7], { dur: 0.4, gain: 0.11, delay: 0.09, type: 'triangle', wet: true });
    }
    buzz(14);
  },
  rankUp() {
    if (on()) [0, 2, 4, 5, 7, 9].forEach((n, k) => tone(SCALE[n], { dur: 0.5, gain: 0.11, delay: k * 0.08, type: 'triangle', wet: true }));
    buzz([20, 40, 20, 40, 60]);
  },
  deny() {
    if (on()) tone(196, { dur: 0.16, gain: 0.1, slide: 0.8, type: 'triangle' });
  }
};

// A sparse generative music box: quiet enough to live under the chimes.
function startMusic() {
  const phrase = () => {
    if (!ac || !opts.music) {
      musicTimer = null;
      return;
    }
    if (ac.state === 'running') {
      const root = [0, 2, 4, 5][Math.floor(Math.random() * 4)];
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const idx = Math.min(SCALE.length - 1, root + Math.floor(Math.random() * 4));
        tone(SCALE[idx] / 2, { dur: 2.2, gain: 0.05, attack: 0.02, delay: i * (0.28 + Math.random() * 0.2), bus: musicBus, wet: true });
      }
      if (Math.random() < 0.5) tone(SCALE[root] / 8, { dur: 4, gain: 0.07, attack: 0.6, bus: musicBus });
    }
    musicTimer = setTimeout(phrase, 1800 + Math.random() * 2600);
  };
  musicTimer = setTimeout(phrase, 600);
}

export { initAudio, applySettings, resumeAudio, sfx };
