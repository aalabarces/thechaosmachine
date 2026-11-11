// RunScene: una run (= un capítulo de la serie). La cargan la página y todos los workers:
// no importa el engine, usa el global WEED.
//
// create()        siempre (partida nueva o restore de hot reload): mundo estático.
// createNewGame() solo partida nueva: el malón inicial.
// update()        cada frame, en la página: input → órdenes, cámara.

import { asset, pad2 } from './assets.js';
import { WORLD, CAMERA } from './config/balance.js';
import { SHEETS, EXCLUDED_LPC_ANIMATIONS, HOUSE_COUNT, TREE_COUNT } from './config/sprites.js';
import { Recruit } from './entities/Recruit.js';
import { MoveMarker } from './entities/MoveMarker.js';
import { CITY_ENTITIES, loadCityData, spawnCity, nearestSidewalk } from './world/cityMap.js';
import { SquadState, SQUAD_STATE_SCHEMA, setSquadTarget } from './systems/squadState.js';
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
    navigation: { enabled: true, cellSize: 48 },
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

  static entities = [[Recruit, 64], [MoveMarker, 8], ...CITY_ENTITIES];

  async preload() {
    this.cityData = await loadCityData();
  }

  create() {
    spawnCity(this.cityData);
    Camera.setZoom(CAMERA.startZoom);
  }

  createNewGame() {
    const spawn = nearestSidewalk(this.cityData, WORLD.width / 2, WORLD.height / 2);
    Recruit.spawn({ x: spawn.x, y: spawn.y });
    setSquadTarget(spawn.x, spawn.y);
    Camera.centerOn(spawn.x, spawn.y);
  }

  update() {
    this.handleMoveInput();
    this.handleZoomInput();
    this.followSquad();
  }

  /** Click o touch: nuevo destino del malón. */
  handleMoveInput() {
    if (!Mouse.isButton0Pressed || Mouse.count > 1) return;
    const x = clamp(Mouse.x, 0, WORLD.width);
    const y = clamp(Mouse.y, 0, WORLD.height);
    setSquadTarget(x, y);
    MoveMarker.spawn({ x, y });
  }

  /** Rueda del mouse o pellizco con dos dedos. */
  handleZoomInput() {
    let z = Camera.targetZoom;
    const before = z;
    if (Mouse.wheel) z *= Math.exp(-Mouse.wheel * CAMERA.wheelSensitivity);
    if (Mouse.count >= 2) z *= Mouse.pinchRatio();
    if (z !== before) Camera.setZoom(clamp(z, CAMERA.minZoom, CAMERA.maxZoom));
  }

  followSquad() {
    const r = Recruit.getFirstActiveIndex();
    if (r == null || r < 0) return;
    Camera.follow(Transform.x[r], Transform.y[r], CAMERA.followSmoothing);
  }
}
