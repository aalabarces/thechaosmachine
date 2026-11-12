// Memoria de corto plazo de la IA: a quién apunta, cuánto le falta para volver a pegar, de qué huye.
// Va en un componente (no en campos sueltos) porque cambia cada tick y lo leen otros hilos.

const { Component } = WEED;

export class Brain extends Component {
  static ARRAY_SCHEMA = {
    target: Int32Array, // índice de la entidad objetivo (persona o drop), -1 = ninguna
    cooldownMs: Float32Array, // hasta poder pegar de nuevo
    actionMs: Float32Array, // animación de golpe en curso: no se pisa con caminar
    progressMs: Float32Array, // looteo acumulado
    threatX: Float32Array, // de dónde viene el peligro (civiles que huyen)
    threatY: Float32Array,
    calmMs: Float32Array, // tiempo sin ver peligro
    homeX: Float32Array, // un punto conocido de vereda: vuelve ahí si se perdió del flowfield
    homeY: Float32Array,
    ignoreDrop: Int32Array, // drop que abandonó por no poder llegar: no lo vuelve a reservar
    lastAttacker: Int32Array, // índice del último que le pegó (-1 = nadie): para contar quién mató a quién
    goalX: Float32Array, // a dónde va cuando no pelea (patrulla de las pandillas)
    goalY: Float32Array,
    zone: Int8Array, // zona de pandilla (-1 = ninguna)
    marching: Uint8Array, // recluta: 1 mientras cumple una orden de moverse (no pelea ni lootea)
    marchMs: Float32Array, // cuánto lleva marchando (para no quedar pasivo si se traba)
  };
}
