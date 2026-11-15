import { SUITS } from './Card.js';

/**
 * Orden fijo de las fundaciones: espadas, corazones, diamantes y tréboles.
 */
export const FOUNDATION_SUITS = SUITS;

/**
 * Devuelve el índice de la fundación que corresponde a un palo.
 *
 * @param {string} suitId
 * @returns {number}
 */
export function getFoundationIndex(suitId) {
  return FOUNDATION_SUITS.findIndex((suit) => suit.id === suitId);
}

/**
 * Indica si una carta puede colocarse sobre una columna del tablero.
 * Las columnas se construyen descendente y alternando colores. Una columna
 * vacía solo acepta un Rey.
 *
 * @param {import('./Card.js').Card} card
 * @param {import('./Card.js').Card|null} targetTop
 * @returns {boolean}
 */
export function canPlaceOnTableau(card, targetTop) {
  if (!card || !card.faceUp) return false;
  if (!targetTop) return card.value === 13;
  return (
    targetTop.faceUp &&
    targetTop.value === card.value + 1 &&
    targetTop.color !== card.color
  );
}

/**
 * Indica si una carta puede colocarse en una fundación.
 * La fundación se construye ascendente y con el mismo palo.
 *
 * @param {import('./Card.js').Card} card
 * @param {import('./Card.js').Card|null} foundationTop
 * @returns {boolean}
 */
export function canPlaceOnFoundation(card, foundationTop) {
  if (!card) return false;
  if (!foundationTop) return card.value === 1;
  return (
    foundationTop.suit.id === card.suit.id &&
    card.value === foundationTop.value + 1
  );
}

/**
 * Comprueba que una secuencia de cartas sea descendente y alternando colores.
 * Se usa para validar el grupo que se mueve desde una columna.
 *
 * @param {import('./Card.js').Card[]} cards
 * @returns {boolean}
 */
export function isValidSequence(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return false;
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    if (!card || !card.faceUp) return false;
    if (i > 0) {
      const previous = cards[i - 1];
      if (previous.value !== card.value + 1 || previous.color === card.color) {
        return false;
      }
    }
  }
  return true;
}
