// Farol de la calle (adaptado de StreetProp en la demo buenosAiresScene, townObjects.js): un poste
// que de noche ilumina la vereda y brilla en la lámpara. Dibujo: assets/img/props/lamp.png
// (el frame u_farola de buenosAires). Lo ubica el generador de ciudad en las veredas.

import { LAMPS, SHADOWS } from '../../config/balance.js';
import { LightHours } from '../../components/LightHours.js';
import { LIGHT_TICK, lightBorn, lightTick } from '../../systems/lightHours.js';

const { GameObject, RigidBody, Collider, SpriteRenderer, ShadowCaster, LightEmitter, ShapeType } = WEED;

/** Tamaño del PNG y dónde está la lámpara, en fracciones del dibujo. */
const TEX_W = 98;
const TEX_H = 317;
const ANCHOR_Y = 0.98;
const BULB = [0.65, 0.09];

export class StreetLamp extends GameObject {
  static tickInterval = LIGHT_TICK;
  static components = [RigidBody, Collider, SpriteRenderer, ShadowCaster, LightEmitter, LightHours];

  /** @param {{ x: number, y: number, flip?: boolean }} spawnConfig flip: la lámpara mira a la izquierda */
  onSpawned({ x = 0, y = 0, flip = false } = {}) {
    this.x = x;
    this.y = y;
    this.rigidBody.static = 1;
    this.setSprite('lamp');
    const e = LAMPS.scale;
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = ANCHOR_Y;
    this.setScale(flip ? -e : e, e);
    // Un poste finito: casi no estorba el paso (y no entra al NavGrid).
    this.collider.shapeType = ShapeType.Circle;
    this.collider.radius = 4;
    this.shadowCaster.heightMultiplier = SHADOWS.lamp;

    const top = TEX_H * ANCHOR_Y * e;
    const L = this.lightEmitter;
    L.lightColor = LAMPS.color;
    // El halo, arriba en la lámpara (en px hacia arriba de la pantalla).
    L.glowHeightOffset = top * 0.97;
    // La luz sale de la mitad del poste: el charco queda parejo y llega más lejos.
    L.sourceHeight = top * 0.5;
    L.hasGlowSprite = LAMPS.glow;
    L.active = 1;
    // Las sombras de su luz salen de los vecinos que ve: hasta acá.
    this.collider.visualRange = 260;

    // Brillo de la lámpara, en la capa aditiva de arriba de todo: uno chico blanco y uno grande del color de la luz.
    const dx = (BULB[0] - 0.5) * TEX_W * e * (flip ? -1 : 1);
    const dy = (BULB[1] - ANCHOR_Y) * TEX_H * e;
    this.addDecoration('_lightGradient', dx, dy, 0.26, 0.26, 1, { tint: 0xfff2d0, alpha: 1, anchorX: 0.5, anchorY: 0.5, layer: 'lampGlows' });
    this.addDecoration('_lightGradient', dx, dy, 0.8, 0.8, 1, { tint: LAMPS.color, alpha: 0.5, anchorX: 0.5, anchorY: 0.5, layer: 'lampGlows' });
    lightBorn(this, LAMPS.radius, 2, 1, 0.5);
  }

  tick() {
    lightTick(this);
  }
}
