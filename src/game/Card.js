/**
 * Palos de la baraja. El orden también define el orden de las fundaciones.
 */
export const SUITS = Object.freeze([
  Object.freeze({ id: 'spades', symbol: '♠', name: 'Espadas', color: 'black' }),
  Object.freeze({ id: 'hearts', symbol: '♥', name: 'Corazones', color: 'red' }),
  Object.freeze({ id: 'diamonds', symbol: '♦', name: 'Diamantes', color: 'red' }),
  Object.freeze({ id: 'clubs', symbol: '♣', name: 'Tréboles', color: 'black' }),
]);

/**
 * Valores y etiquetas de las cartas.
 */
export const RANKS = Object.freeze([
  Object.freeze({ value: 1, label: 'A' }),
  Object.freeze({ value: 2, label: '2' }),
  Object.freeze({ value: 3, label: '3' }),
  Object.freeze({ value: 4, label: '4' }),
  Object.freeze({ value: 5, label: '5' }),
  Object.freeze({ value: 6, label: '6' }),
  Object.freeze({ value: 7, label: '7' }),
  Object.freeze({ value: 8, label: '8' }),
  Object.freeze({ value: 9, label: '9' }),
  Object.freeze({ value: 10, label: '10' }),
  Object.freeze({ value: 11, label: 'J' }),
  Object.freeze({ value: 12, label: 'Q' }),
  Object.freeze({ value: 13, label: 'K' }),
]);

/**
 * Carta de la baraja.
 */
export class Card {
  /**
   * @param {{id: string, symbol: string, name: string, color: 'red'|'black'}} suit
   * @param {{value: number, label: string}} rank
   */
  constructor(suit, rank) {
    /** @type {string} */
    this.id = `${suit.id}-${rank.value}`;
    /** @type {typeof SUITS[number]} */
    this.suit = suit;
    /** @type {typeof RANKS[number]} */
    this.rank = rank;
    /** @type {boolean} */
    this.faceUp = false;
  }

  /**
   * Color de la carta.
   *
   * @returns {'red'|'black'}
   */
  get color() {
    return this.suit.color;
  }

  /**
   * Etiqueta corta: A, 2, ..., K.
   *
   * @returns {string}
   */
  get label() {
    return this.rank.label;
  }

  /**
   * Valor numérico: 1 (As) a 13 (Rey).
   *
   * @returns {number}
   */
  get value() {
    return this.rank.value;
  }

  /**
   * Representación legible para depuración.
   *
   * @returns {string}
   */
  toString() {
    return `${this.label}${this.suit.symbol}`;
  }

  /**
   * Datos mínimos para guardar una carta en un snapshot.
   *
   * @returns {{id: string, faceUp: boolean}}
   */
  toJSON() {
    return { id: this.id, faceUp: this.faceUp };
  }
}
