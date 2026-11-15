/**
 * Versión del formato de snapshot. Permite rechazar estados incompatibles.
 */
export const SNAPSHOT_VERSION = 1;

/**
 * Clona un snapshot de forma profunda. El snapshot solo contiene datos
 * planos (números, textos, arreglos y objetos), por lo que JSON es suficiente.
 *
 * @template T
 * @param {T} snapshot
 * @returns {T}
 * @complexity O(n)
 */
export function cloneSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

/**
 * Comprueba de forma básica que un objeto tenga la forma de un snapshot.
 *
 * @param {unknown} snapshot
 * @returns {boolean}
 */
export function isSnapshotLike(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const value = /** @type {Record<string, unknown>} */ (snapshot);
  return (
    Array.isArray(value.stock) &&
    Array.isArray(value.waste) &&
    Array.isArray(value.foundations) &&
    Array.isArray(value.tableau) &&
    typeof value.score === 'number' &&
    typeof value.moves === 'number'
  );
}
