/**
 * Generador pseudoaleatorio determinista (mulberry32).
 * Permite reproducir una partida con la misma semilla en pruebas y demos.
 *
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crea un generador aleatorio. Si no se recibe semilla usa Math.random.
 *
 * @param {number} [seed]
 * @returns {() => number}
 */
export function makeRng(seed) {
  if (seed === undefined || seed === null) return Math.random;
  return mulberry32(seed);
}

/**
 * Genera una semilla de 32 bits para una partida nueva.
 *
 * @returns {number}
 */
export function randomSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
