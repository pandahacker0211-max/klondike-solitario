/**
 * Puntos que se suman o restan por cada acción del juego.
 * Se documentan en el manual de usuario.
 */
export const SCORE_VALUES = Object.freeze({
  FOUNDATION: 10,
  REVEAL: 5,
  FOUNDATION_TO_TABLEAU: -15,
  RECYCLE: -20,
  WIN: 100,
});

/**
 * Aplica un cambio de puntaje sin permitir valores negativos.
 *
 * @param {number} current
 * @param {number} delta
 * @returns {number}
 * @complexity O(1)
 */
export function applyScore(current, delta) {
  return Math.max(0, current + delta);
}
