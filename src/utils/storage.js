/**
 * Almacenamiento en memoria para pruebas o para navegadores donde
 * localStorage no está disponible (modo privado, cuota, etc.).
 */
export const memoryStorage = {
  /** @type {Record<string, string>} */
  data: {},
  /**
   * @param {string} key
   * @returns {string|null}
   */
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  },
  /**
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  setItem(key, value) {
    this.data[key] = String(value);
  },
  /**
   * @param {string} key
   * @returns {void}
   */
  removeItem(key) {
    delete this.data[key];
  },
};

/**
 * Devuelve localStorage si se puede usar; si no, el almacenamiento en memoria.
 *
 * @returns {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void}}
 */
export function getStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return memoryStorage;
    const probe = '__klondike_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

/**
 * Lee y parsea un valor JSON. Devuelve el valor por defecto si no existe
 * o si está corrupto.
 *
 * @template T
 * @param {{getItem: (key: string) => string|null}} storage
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function loadJSON(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Guarda un valor como JSON. No lanza errores si el almacenamiento falla.
 *
 * @param {{setItem: (key: string, value: string) => void}} storage
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean}
 */
export function saveJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
