/**
 * Nodo interno de la cola.
 * Guarda un valor y una referencia al siguiente nodo.
 */
class QueueNode {
  /**
   * @param {*} value
   */
  constructor(value) {
    this.value = value;
    /** @type {QueueNode|null} */
    this.next = null;
  }
}

/**
 * Cola (Queue) implementada desde cero con nodos enlazados.
 * Sigue la disciplina FIFO: el primero que entra es el primero que sale.
 *
 * @template T
 */
export class Queue {
  /** @type {QueueNode|null} */
  #head = null;
  /** @type {QueueNode|null} */
  #tail = null;
  /** @type {number} */
  #size = 0;

  /**
   * Encola un elemento al final.
   *
   * @param {T} value
   * @returns {this}
   * @complexity O(1)
   */
  enqueue(value) {
    const node = new QueueNode(value);
    if (this.#tail === null) {
      this.#head = node;
      this.#tail = node;
    } else {
      this.#tail.next = node;
      this.#tail = node;
    }
    this.#size += 1;
    return this;
  }

  /**
   * Desencola y devuelve el elemento del frente.
   *
   * @returns {T|null} El valor del frente o `null` si la cola está vacía.
   * @complexity O(1)
   */
  dequeue() {
    if (this.#head === null) return null;
    const node = this.#head;
    this.#head = node.next;
    if (this.#head === null) this.#tail = null;
    this.#size -= 1;
    node.next = null;
    return node.value;
  }

  /**
   * Devuelve el elemento del frente sin desencolarlo.
   *
   * @returns {T|null}
   * @complexity O(1)
   */
  front() {
    return this.#head === null ? null : this.#head.value;
  }

  /**
   * Indica si la cola está vacía.
   *
   * @returns {boolean}
   * @complexity O(1)
   */
  isEmpty() {
    return this.#size === 0;
  }

  /**
   * Devuelve la cantidad de elementos.
   *
   * @returns {number}
   * @complexity O(1)
   */
  size() {
    return this.#size;
  }

  /**
   * Vacía la cola.
   *
   * @returns {void}
   * @complexity O(1)
   */
  clear() {
    this.#head = null;
    this.#tail = null;
    this.#size = 0;
  }

  /**
   * Devuelve una instantánea de los elementos, del frente hacia el final.
   * Se usa para la interfaz, las pruebas y la serialización.
   *
   * @returns {T[]}
   * @complexity O(n)
   */
  toArray() {
    const values = [];
    let current = this.#head;
    while (current !== null) {
      values.push(current.value);
      current = current.next;
    }
    return values;
  }
}
