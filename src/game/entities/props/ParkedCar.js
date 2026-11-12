// Auto estacionado junto al cordón. Se le rompen los vidrios con cada golpe; destrozado queda
// como chatarra quemada que sigue sirviendo de cobertura. Adentro: plata, a veces armas o chaleco.

import { Prop } from './Prop.js';
import { PROPS } from '../../config/balance.js';
import { emitGlass } from '../../systems/effects.js';

const { ShapeType, rng } = WEED;

export const CAR_SHEETS = ['car_red', 'car_blue', 'car_white', 'car_yellow', 'car_black'];
export const WRECK_SHEET = 'car_burnt';
/** Ángulos que se cargan de cada hoja (el resto del giro no se usa: autos quietos). */
export const CAR_ANGLES = ['0', '90', '180', '270'];

export class ParkedCar extends Prop {
  static stats = PROPS.parkedCar;
  static lootTable = 'parkedCar';
  static debrisTint = 0x9aa3ad;
  static hitSounds = ['metal1', 'metal2'];

  /** @param {{ x: number, y: number, angle?: string }} spawnConfig angle: '0' | '90' | '180' | '270' */
  onSpawned(spawnConfig = {}) {
    super.onSpawned(spawnConfig);
    const angle = CAR_ANGLES.includes(spawnConfig.angle) ? spawnConfig.angle : '0';
    this._angle = angle;
    this.setSpritesheet(CAR_SHEETS[(rng() * CAR_SHEETS.length) | 0]);
    this.setAnimation(angle);
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.5;
    const horizontal = angle === '0' || angle === '180';
    this.collider.shapeType = ShapeType.Box;
    this.collider.width = horizontal ? 74 : 38;
    this.collider.height = horizontal ? 30 : 56;
    this.collider.offsetX = 0;
    this.collider.offsetY = 0;
    this.collider.visualRange = 80;
  }

  /** '0' | '90' | '180' | '270' (campo por hilo: solo lo usa onBroken, en el mismo worker). */
  _angle = '0';

  onHitEffect() {
    emitGlass(this.x, this.y, 5);
  }

  onBroken() {
    emitGlass(this.x, this.y, 18);
    this.setSpritesheet(WRECK_SHEET);
    this.setAnimation(this._angle);
    this.setTint(PROPS.wreckTint);
  }
}
