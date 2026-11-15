/**
 * Configuración general del juego.
 * Los valores que el usuario puede cambiar se guardan en localStorage.
 */

export const APP_NAME = 'Klondike';

/** Clave de localStorage para los ajustes. */
export const SETTINGS_KEY = 'klondike.settings.v1';

/** Clave de localStorage para el ranking. */
export const SCORES_KEY = 'klondike.scores.v1';

/** Cantidad máxima de puntajes que se conservan en el ranking. */
export const MAX_SCORES = 10;

/** Opciones permitidas para el modo de robo. */
export const DRAW_OPTIONS = [1, 3];

/** Opciones permitidas para la cantidad de pases. */
export const PASS_OPTIONS = [3, 5, 'infinite'];

/** Ajustes iniciales. */
export const DEFAULT_SETTINGS = Object.freeze({
  drawCount: 1,
  passLimit: 3,
});

/**
 * Convierte el valor de pases guardado en localStorage al valor numérico
 * que usa el juego. El valor `'infinite'` se transforma en `Infinity`.
 *
 * @param {number|string} value Valor almacenado.
 * @returns {number} Número de pases o `Infinity`.
 */
export function normalizePassLimit(value) {
  if (value === 'infinite' || value === Infinity) return Infinity;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 3;
}

/**
 * Valida y normaliza los ajustes recibidos.
 *
 * @param {Partial<{drawCount: number, passLimit: number|string}>} settings
 * @returns {{drawCount: number, passLimit: number|string}}
 */
export function normalizeSettings(settings = {}) {
  const drawCount = DRAW_OPTIONS.includes(Number(settings.drawCount))
    ? Number(settings.drawCount)
    : DEFAULT_SETTINGS.drawCount;
  const rawPass = settings.passLimit ?? DEFAULT_SETTINGS.passLimit;
  const passLimit = rawPass === 'infinite' || rawPass === Infinity
    ? 'infinite'
    : PASS_OPTIONS.includes(Number(rawPass))
      ? Number(rawPass)
      : DEFAULT_SETTINGS.passLimit;
  return { drawCount, passLimit };
}
