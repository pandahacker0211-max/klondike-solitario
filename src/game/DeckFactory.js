import { DoublyLinkedList } from '../structures/DoublyLinkedList.js';
import { Queue } from '../structures/Queue.js';
import { Card, SUITS, RANKS } from './Card.js';

/**
 * Crea una baraja ordenada de 52 cartas en una lista doblemente enlazada.
 * La lista se usa también para barajar: se extrae una posición aleatoria
 * y se encola cada carta.
 *
 * @returns {DoublyLinkedList<Card>}
 * @complexity O(n)
 */
export function createOrderedDeck() {
  const deck = new DoublyLinkedList();
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.insertAtEnd(new Card(suit, rank));
    }
  }
  return deck;
}

/**
 * Crea una cola de 52 cartas barajadas con el generador aleatorio recibido.
 * El algoritmo es un Fisher-Yates adaptado a la lista doble: en cada paso
 * se elimina una posición aleatoria y se encola la carta.
 *
 * @param {() => number} rng Generador de números en [0, 1).
 * @returns {Queue<Card>}
 * @complexity O(n²) por la eliminación en posiciones aleatorias; n = 52.
 */
export function createShuffledDeck(rng = Math.random) {
  const ordered = createOrderedDeck();
  const queue = new Queue();
  while (!ordered.isEmpty()) {
    const index = Math.floor(rng() * ordered.size());
    queue.enqueue(ordered.removeAt(index));
  }
  return queue;
}

/**
 * Crea un registro de las 52 cartas por id. Se usa para reconstruir
 * snapshots y para localizar cartas por su identificador.
 *
 * @returns {Record<string, Card>}
 * @complexity O(n)
 */
export function createCardRegistry() {
  const registry = {};
  const deck = createOrderedDeck();
  while (!deck.isEmpty()) {
    const card = deck.removeAt(0);
    registry[card.id] = card;
  }
  return registry;
}
