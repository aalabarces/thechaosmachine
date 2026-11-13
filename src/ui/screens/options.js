// Opciones: volumen de música y de efectos, y pantalla completa. Se usan desde el menú
// principal y desde la pausa. Cada cambio se aplica y se guarda al instante.

import { openScreen, el, button } from './screen.js';
import { saveSettings } from '../../meta/settings.js';
import { music } from '../music.js';

/**
 * Los controles de opciones (sin tarjeta propia), para meterlos en cualquier pantalla.
 * @param {{ musicVolume: number, sfxVolume: number }} settings se modifica y se guarda
 * @param {any} WEED el engine (SoundManager para el volumen de efectos)
 */
export function buildOptions(settings, WEED) {
  const box = el('div', 'options');
  box.append(
    slider('Música', settings.musicVolume, (v) => {
      settings.musicVolume = v;
      music.setVolume(v);
      saveSettings(settings);
    }),
    slider('Efectos', settings.sfxVolume, (v) => {
      settings.sfxVolume = v;
      WEED.SoundManager.setMasterVolume(v);
      saveSettings(settings);
    }),
  );
  if (document.fullscreenEnabled) {
    const fs = button(fullscreenLabel(), async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        // el navegador no lo permitió
      }
      fs.textContent = fullscreenLabel();
    });
    box.append(fs);
  }
  return box;
}

/** Pantalla de opciones sola (desde el menú principal). @returns {Promise<void>} al volver */
export function showOptions(root, settings, WEED) {
  return new Promise((resolve) => {
    const s = openScreen(root, 'options-screen');
    const list = el('div', 'screen-buttons');
    list.append(
      button(
        'VOLVER',
        () => {
          s.close();
          resolve();
        },
        'primary',
      ),
    );
    s.card.append(el('div', 'screen-title', 'OPCIONES'), buildOptions(settings, WEED), list);
  });
}

function fullscreenLabel() {
  return document.fullscreenElement ? 'SALIR DE PANTALLA COMPLETA' : 'PANTALLA COMPLETA';
}

function slider(label, value, onChange) {
  const row = el('label', 'option-row');
  const name = el('span', 'option-name', label);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.value = String(Math.round(value * 100));
  const pct = el('span', 'option-value', `${input.value}%`);
  input.addEventListener('input', () => {
    pct.textContent = `${input.value}%`;
    onChange(Number(input.value) / 100);
  });
  row.append(name, input, pct);
  return row;
}
