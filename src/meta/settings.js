// Opciones del jugador (volúmenes, calidad gráfica), guardadas en el dispositivo. Aparte del
// perfil: "partida nueva" borra el progreso pero no las opciones.

const STORAGE_KEY = 'chaos-machine-settings-v1';

/** Celular (pantalla táctil como puntero principal): calidad baja por defecto; PC: alta. */
function defaultGraphics() {
  try {
    return matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

const DEFAULTS = {
  /** 0..1 */
  musicVolume: 0.6,
  /** 0..1 */
  sfxVolume: 1,
  /** 'high' | 'low' | 'off' (ver game/systems/runVisuals.js). Vale desde el próximo capítulo. */
  graphics: defaultGraphics(),
};

/** @returns {{ musicVolume: number, sfxVolume: number, graphics: string }} */
export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // sin almacenamiento: valen para esta sesión
  }
}
