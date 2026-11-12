// RunScene: una run (= un capítulo de la serie). La cargan la página y todos los workers:
// no importa el engine, usa el global WEED.
//
// create()        siempre (partida nueva o restore de hot reload): mundo estático.
// createNewGame() solo partida nueva: el malón inicial.
// update()        cada frame, en la página: input → órdenes, cámara.

import { asset, pad2 } from './assets.js';
import { WORLD, CAMERA, SQUAD, INPUT, NAV } from './config/balance.js';
import { SHEETS, EXCLUDED_LPC_ANIMATIONS, HOUSE_COUNT, TREE_COUNT } from './config/sprites.js';
import { Recruit } from './entities/Recruit.js';
import { MoveMarker } from './entities/MoveMarker.js';
import { CITY_ENTITIES, loadCityData, spawnCity, nearestSidewalk } from './world/cityMap.js';
import { SquadState, SQUAD_STATE_SCHEMA, setSquadTarget, squadCentroid } from './systems/squadState.js';
import { RunState, RUN_STATE_SCHEMA } from './systems/runState.js';

const { Scene, Camera, Mouse, Transform, LAYER_KIND } = WEED;

function numberedTextures(prefix, folder, count) {
  const out = {};
  for (let i = 1; i <= count; i++) out[`${prefix}_${pad2(i)}`] = asset(`img/${folder}/${prefix}_${pad2(i)}.png`);
  return out;
}

function personSheets(names) {
  const out = {};
  for (const name of names) {
    out[name] = {
      json: asset('img/people/lpc_character.json'),
      png: asset(`img/people/${name}.png`),
      excludeAnimations: EXCLUDED_LPC_ANIMATIONS,
    };
  }
  return out;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

const _centroid = { x: 0, y: 0 };

export class RunScene extends Scene {
  static config = {
    worldWidth: WORLD.width,
    worldHeight: WORLD.height,
    spatial: { cellSize: 128, maxNeighbors: 128 },
    logic: { numberOfLogicWorkers: 1 },
    // El mapa crea ~1300 cuerpos estáticos de una vez: el anillo de comandos tiene que entrarlos.
    physics: { gravity: { x: 0, y: 0 }, sleeping: true, commandRingCapacity: 16384 },
    renderer: { backend: 'webgl', ySort: true },
    lighting: { enabled: false },
    navigation: { enabled: true, cellSize: NAV.cellSize },
    layers: {
      ground: { kind: LAYER_KIND.TILEMAP, tilemap: 'city', scale: 1, zIndex: 0.5 },
    },
  };

  static assets = {
    textures: {
      ...numberedTextures('house', 'houses', HOUSE_COUNT),
      ...numberedTextures('tree', 'trees', TREE_COUNT),
    },
    spritesheets: {
      ...personSheets(SHEETS.recruit),
    },
    tilemaps: {
      city: { json: asset('map/little_city_tilemap.json'), png: asset('map/tiles.png') },
    },
  };

  static sharedResources = [
    [SquadState, SQUAD_STATE_SCHEMA],
    [RunState, RUN_STATE_SCHEMA],
  ];

  static messages = ['markerDone'];

  static entities = [[Recruit, SQUAD.maxRecruits], [MoveMarker, 8], ...CITY_ENTITIES];

  async preload() {
    this.cityData = await loadCityData();
  }

  create() {
    spawnCity(this.cityData);
    Camera.setZoom(CAMERA.startZoom);
    // Estado del input (solo página): cuándo empezó el apretón y cuándo se movió el destino por última vez.
    this._pressAt = 0;
    this._lastDragAt = 0;
    // Zoom al que se quiere llegar; el de la cámara se le acerca de a poco (handleZoomInput).
    this._zoomGoal = CAMERA.startZoom;
  }

  /** @param {{ startRecruits?: number }} data lo que manda main.js (más adelante: perfil y loadout) */
  createNewGame({ startRecruits = 1 } = {}) {
    const spawn = nearestSidewalk(this.cityData, WORLD.width / 2, WORLD.height / 2);
    const count = clamp(startRecruits | 0, 1, SQUAD.maxRecruits);
    for (let k = 0; k < count; k++) {
      // Apiñados en espiral alrededor del punto de partida; la separación los acomoda.
      const r = SQUAD.formationSpacing * Math.sqrt(k);
      const a = k * 2.4;
      Recruit.spawn({ x: spawn.x + Math.cos(a) * r, y: spawn.y + Math.sin(a) * r });
    }
    setSquadTarget(spawn.x, spawn.y);
    Camera.centerOn(spawn.x, spawn.y);
  }

  update(dtRatio, simMs) {
    this.handleMoveInput();
    this.handleZoomInput(simMs);
    this.followSquad();
  }

  /**
   * Click/touch: nuevo destino del malón. Manteniendo apretado, el destino sigue al puntero
   * (con un mínimo de distancia y de tiempo: cada destino nuevo pide un flowfield).
   * Con dos dedos no se mueve: es pellizco de zoom.
   */
  handleMoveInput() {
    if (Mouse.count > 1) return;
    const now = performance.now();
    if (Mouse.isButton0Pressed) {
      this._pressAt = now;
      this._lastDragAt = now;
      this.orderMove(Mouse.x, Mouse.y);
      return;
    }
    if (!Mouse.isButton0Down || now - this._pressAt < INPUT.dragDelayMs) return;
    if (now - this._lastDragAt < INPUT.dragIntervalMs) return;
    const dx = Mouse.x - SquadState.target[0];
    const dy = Mouse.y - SquadState.target[1];
    if (dx * dx + dy * dy < INPUT.dragMinStep * INPUT.dragMinStep) return;
    this._lastDragAt = now;
    this.orderMove(Mouse.x, Mouse.y);
  }

  orderMove(wx, wy) {
    const x = clamp(wx, 0, WORLD.width);
    const y = clamp(wy, 0, WORLD.height);
    setSquadTarget(x, y);
    MoveMarker.spawn({ x, y });
  }

  /**
   * Rueda del mouse o pellizco con dos dedos mueven el zoom objetivo; la cámara se le acerca
   * suave (exponencial, independiente de los fps), en escala logarítmica para que acercar y
   * alejar se sientan iguales. Camera.setZoom deja fija la esquina superior izquierda, así que
   * después de cada paso se recentra en el mismo punto: el zoom es sobre el centro de la pantalla.
   */
  handleZoomInput(dtMs) {
    let goal = this._zoomGoal;
    if (Mouse.wheel) goal *= Math.exp(-Mouse.wheel * CAMERA.wheelSensitivity);
    if (Mouse.count >= 2) goal *= Mouse.pinchRatio();
    // Camera.minZoom: el engine no deja alejar más de lo que muestra el mundo entero.
    goal = clamp(goal, Math.max(CAMERA.minZoom, Camera.minZoom), CAMERA.maxZoom);
    this._zoomGoal = goal;

    const z = Camera.zoom;
    if (z === goal) return;
    const k = 1 - Math.exp(-(dtMs > 0 ? dtMs : 16.67) / CAMERA.zoomSmoothingMs);
    let next = z * Math.pow(goal / z, k);
    if (Math.abs(next - goal) < goal * 0.001) next = goal;

    const cx = Camera.centerX;
    const cy = Camera.centerY;
    Camera.setZoom(next);
    Camera.centerOn(cx, cy);
  }

  /** La cámara sigue al centro del malón. */
  followSquad() {
    if (squadCentroid(Recruit, Transform, _centroid) === 0) return;
    Camera.follow(_centroid.x, _centroid.y, CAMERA.followSmoothing);
  }
}
