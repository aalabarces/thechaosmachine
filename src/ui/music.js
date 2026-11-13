// Música (página). HTML Audio, fuera del engine: cada capítulo es una carga nueva de escena y el
// engine reinicia sus sonidos al cambiar de escena; la música tiene que seguir de largo.
//
// Pistas (assets/audio/music/, mp3 en loop). Si un archivo no está, esa pista queda en silencio:
//   menu.mp3          menú y pantallas entre capítulos
//   run_calm.mp3      capítulo con poco heat
//   run_intense.mp3   capítulo con heat alto (desde MUSIC.intenseFromStars estrellas)
// Durante el capítulo, calma e intensidad suenan juntas y se cruzan según el heat.

import { asset } from '../game/assets.js';

export const MUSIC = {
  tracks: {
    menu: asset('audio/music/menu.mp3'),
    calm: asset('audio/music/run_calm.mp3'),
    intense: asset('audio/music/run_intense.mp3'),
  },
  /** Desde cuántas estrellas de heat suena la pista intensa. */
  intenseFromStars: 2,
  /** Cuánto tarda un cruce de pistas (ms). */
  fadeMs: 1500,
};

class Track {
  constructor(url) {
    this.el = new Audio();
    this.el.loop = true;
    this.el.preload = 'auto';
    this.el.src = url;
    this.ok = true;
    this.el.addEventListener('error', () => {
      this.ok = false; // sin archivo: silencio
    });
    this.level = 0; // 0..1, volumen relativo actual
    this.target = 0;
  }

  apply(master) {
    this.el.volume = Math.max(0, Math.min(1, this.level * master));
    if (!this.ok) return;
    if (this.level > 0.001 && this.el.paused) this.el.play().catch(() => {});
    else if (this.level <= 0.001 && !this.el.paused) this.el.pause();
  }
}

class MusicPlayer {
  constructor() {
    this.tracks = {};
    for (const [name, url] of Object.entries(MUSIC.tracks)) this.tracks[name] = new Track(url);
    this.volume = 0.6;
    this.mode = 'none';
    this.intensity = 0;
    this.unlocked = false;
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
    // Los navegadores no dejan sonar nada antes del primer toque: se arranca con el primero.
    const unlock = () => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  /** 'menu' | 'run' | 'none' */
  play(mode) {
    this.mode = mode;
    this._retarget();
  }

  /** Estrellas de heat actuales (durante el capítulo). */
  setHeatStars(stars) {
    const intensity = stars >= MUSIC.intenseFromStars ? 1 : 0;
    if (intensity === this.intensity) return;
    this.intensity = intensity;
    this._retarget();
  }

  setVolume(v) {
    this.volume = v;
  }

  _retarget() {
    const t = this.tracks;
    t.menu.target = this.mode === 'menu' ? 1 : 0;
    t.calm.target = this.mode === 'run' ? 1 - this.intensity : 0;
    t.intense.target = this.mode === 'run' ? this.intensity : 0;
  }

  _loop(now) {
    const dt = now - this._last;
    this._last = now;
    const step = dt / MUSIC.fadeMs;
    for (const track of Object.values(this.tracks)) {
      const d = track.target - track.level;
      track.level += Math.abs(d) <= step ? d : Math.sign(d) * step;
      if (this.unlocked) track.apply(this.volume);
    }
    requestAnimationFrame(this._loop);
  }
}

/** Un solo reproductor para toda la página. */
export const music = new MusicPlayer();
