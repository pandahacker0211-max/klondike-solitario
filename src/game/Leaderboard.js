import { BST } from '../structures/BST.js';
import { MAX_SCORES, SCORES_KEY } from '../config.js';
import { getStorage } from '../utils/storage.js';

/**
 * Ranking de mejores puntajes. Usa un BST propio: la clave es el puntaje y
 * el valor es la información de la partida. Los puntajes repetidos se
 * insertan a la derecha y la poda elimina el mínimo cuando se supera el límite.
 */
export class Leaderboard {
  /** @type {BST<object>} */
  #tree = new BST();
  /** @type {{getItem: Function, setItem: Function, removeItem: Function}} */
  #storage;
  /** @type {string} */
  #key;
  /** @type {number} */
  #maxEntries;

  /**
   * @param {{storage?: object, key?: string, maxEntries?: number}} [options]
   */
  constructor(options = {}) {
    this.#storage = options.storage ?? getStorage();
    this.#key = options.key ?? SCORES_KEY;
    this.#maxEntries = options.maxEntries ?? MAX_SCORES;
    this.load();
  }

  /**
   * Carga el ranking desde el almacenamiento. Si el contenido está corrupto
   * lo ignora y empieza con un árbol vacío.
   *
   * @returns {void}
   * @complexity O(n log n)
   */
  load() {
    try {
      const raw = this.#storage.getItem(this.#key);
      if (!raw) return;
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries)) return;
      for (const rawEntry of entries) {
        const entry = this.#normalizeEntry(rawEntry);
        if (entry) this.#tree.insert(entry.score, entry);
      }
      this.#prune();
    } catch {
      this.#tree.clear();
    }
  }

  /**
   * Agrega un puntaje. Si el ranking supera el máximo, elimina el mínimo.
   *
   * @param {{score: number, name: string, mode?: string, time?: number, moves?: number, date?: string}} data
   * @returns {object|null} La entrada guardada o `null` si es inválida.
   * @complexity O(log n) promedio
   */
  add(data) {
    const entry = this.#normalizeEntry(data);
    if (!entry) return null;
    this.#tree.insert(entry.score, entry);
    this.#prune();
    this.save();
    return entry;
  }

  /**
   * Indica si un puntaje entraría al ranking con el límite actual.
   * Sirve para informar al jugador con precisión al terminar una partida.
   *
   * @param {number} score
   * @returns {boolean}
   * @complexity O(log n) promedio
   */
  qualifies(score) {
    const value = Number(score);
    if (!Number.isFinite(value)) return false;
    if (this.#tree.size() < this.#maxEntries) return true;
    const min = this.#tree.minEntry();
    return min ? value >= min.key : true;
  }

  /**
   * Elimina una ocurrencia del puntaje indicado.
   *
   * @param {number} score
   * @returns {boolean}
   * @complexity O(log n) promedio
   */
  remove(score) {
    const removed = this.#tree.delete(score);
    if (removed) this.save();
    return removed;
  }

  /**
   * Busca una entrada por puntaje exacto.
   *
   * @param {number} score
   * @returns {object|null}
   * @complexity O(log n) promedio
   */
  search(score) {
    return this.#tree.search(score);
  }

  /**
   * Devuelve las mejores entradas, de mayor a menor.
   *
   * @param {number} [limit]
   * @returns {Array<object>}
   * @complexity O(n)
   */
  top(limit = this.#maxEntries) {
    const ascending = [];
    this.#tree.inOrder((score, entry) => {
      ascending.push({ score, ...entry });
    });
    return ascending.reverse().slice(0, limit);
  }

  /**
   * Borra todo el ranking.
   *
   * @returns {void}
   * @complexity O(1)
   */
  clear() {
    this.#tree.clear();
    this.save();
  }

  /**
   * Guarda el ranking serializado con recorrido inorden.
   *
   * @returns {boolean}
   * @complexity O(n)
   */
  save() {
    try {
      const entries = [];
      this.#tree.inOrder((score, entry) => {
        entries.push({ ...entry, score });
      });
      this.#storage.setItem(this.#key, JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Información para el inspector de estructuras.
   *
   * @returns {{size: number, inOrder: string[], preOrder: string[], postOrder: string[]}}
   */
  getDebugInfo() {
    const label = (score, entry) => `${score} → ${entry.name} (${entry.mode || 'clásico'})`;
    const inOrder = [];
    const preOrder = [];
    const postOrder = [];
    this.#tree.inOrder((score, entry) => inOrder.push(label(score, entry)));
    this.#tree.preOrder((score, entry) => preOrder.push(label(score, entry)));
    this.#tree.postOrder((score, entry) => postOrder.push(label(score, entry)));
    return { size: this.#tree.size(), inOrder, preOrder, postOrder };
  }

  /**
   * Elimina el mínimo mientras haya más entradas que el máximo permitido.
   *
   * @returns {void}
   * @private
   */
  #prune() {
    while (this.#tree.size() > this.#maxEntries) {
      const min = this.#tree.minEntry();
      if (!min) break;
      this.#tree.delete(min.key);
    }
  }

  /**
   * Valida y normaliza una entrada del ranking.
   *
   * @param {object} data
   * @returns {object|null}
   * @private
   */
  #normalizeEntry(data) {
    if (!data || typeof data !== 'object') return null;
    const score = Number(data.score);
    if (!Number.isFinite(score)) return null;
    const name = String(data.name ?? 'Jugador')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 20) || 'Jugador';
    return {
      score,
      name,
      mode: typeof data.mode === 'string' ? data.mode.slice(0, 30) : 'clásico',
      time: Number.isFinite(Number(data.time)) ? Number(data.time) : 0,
      moves: Number.isFinite(Number(data.moves)) ? Number(data.moves) : 0,
      date: typeof data.date === 'string' ? data.date : new Date().toISOString(),
    };
  }
}
