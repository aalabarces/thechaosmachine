// Opciones del jugador (volúmenes), guardadas en el dispositivo. Aparte del perfil: "partida
// nueva" borra el progreso pero no las opciones.

const STORAGE_KEY = 'chaos-machine-settings-v1';

const DEFAULTS = {
  /** 0..1 */
  musicVolume: 0.6,
  /** 0..1 */
  sfxVolume: 1,
};

/** @returns {{ musicVolume: number, sfxVolume: number }} */
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
