/**
 * Nodo interno de la pila.
 * Guarda un valor y una referencia al nodo que está debajo.
 */
class StackNode {
  /**
   * @param {*} value
   */
  constructor(value) {
    this.value = value;
    /** @type {StackNode|null} */
    this.next = null;
  }
}

/**
 * Pila (Stack) implementada desde cero con nodos enlazados.
 * Sigue la disciplina LIFO: el último elemento que entra es el primero que sale.
 *
 * @template T
 */
export class Stack {
  /** @type {StackNode|null} */
  #top = null;
  /** @type {number} */
  #size = 0;

  /**
   * Apila un elemento en el tope.
   *
   * @param {T} value
   * @returns {this}
   * @complexity O(1)
   */
  push(value) {
    const node = new StackNode(value);
    node.next = this.#top;
    this.#top = node;
    this.#size += 1;
    return this;
  }

  /**
   * Desapila y devuelve el elemento del tope.
   *
   * @returns {T|null} El valor del tope o `null` si la pila está vacía.
   * @complexity O(1)
   */
  pop() {
    if (this.#top === null) return null;
    const node = this.#top;
    this.#top = node.next;
    this.#size -= 1;
    return node.value;
  }

  /**
   * Devuelve el elemento del tope sin desapilarlo.
   *
   * @returns {T|null}
   * @complexity O(1)
   */
  peek() {
    return this.#top === null ? null : this.#top.value;
  }

  /**
   * Indica si la pila está vacía.
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
   * Vacía la pila.
   *
   * @returns {void}
   * @complexity O(1)
   */
  clear() {
    this.#top = null;
    this.#size = 0;
  }

  /**
   * Devuelve una instantánea de los elementos, de abajo hacia arriba.
   * Se usa para la interfaz, las pruebas y la serialización; la pila
   * sigue almacenando sus datos en nodos enlazados.
   *
   * @returns {T[]}
   * @complexity O(n)
   */
  toArray() {
    const values = [];
    let current = this.#top;
    while (current !== null) {
      values.push(current.value);
      current = current.next;
    }
    return values.reverse();
  }
}
