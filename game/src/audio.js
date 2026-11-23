// Sound, synthesized live with WebAudio: no audio files, nothing fetched. An engine hum
// that follows the car's speed, a two-tone police siren while wanted, and short blips for
// pickups, punches and mission jingles. Everything starts on the first user gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 780;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function blip(freq, dur, type = 'sine', vol = 0.25, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    /** Call on the first key or click so the browser allows audio. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** Engine hum follows speed 0..1; silent on foot. */
    engine(speed01) {
      if (!ctx || muted) return;
      engineGain.gain.value = speed01 > 0.02 ? 0.05 + speed01 * 0.06 : 0;
      engineOsc.frequency.value = 55 + speed01 * 130;
    },
    /** Two-tone siren while wanted; call every frame with the wanted level. */
    siren(stars, time) {
      if (!ctx || muted) {
        sirenOn = false;
        return;
      }
      sirenOn = stars > 0;
      sirenGain.gain.value = sirenOn ? 0.045 : 0;
      if (sirenOn) sirenOsc.frequency.value = Math.floor(time * 2.2) % 2 === 0 ? 780 : 1040;
    },
    pickup() {
      blip(880, 0.12, 'sine', 0.3);
      blip(1320, 0.16, 'sine', 0.25, 0.09);
    },
    punch() {
      blip(140, 0.1, 'square', 0.3);
    },
    crash() {
      blip(90, 0.25, 'sawtooth', 0.35);
    },
    mission() {
      [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.28, i * 0.12));
    },
    fail() {
      [392, 330, 262].forEach((f, i) => blip(f, 0.3, 'triangle', 0.25, i * 0.16));
    },
    click() {
      blip(660, 0.06, 'sine', 0.2);
    },
  };
}
