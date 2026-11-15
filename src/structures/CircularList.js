/**
 * Nodo interno de la lista circular simple.
 */
class CircularNode {
  /**
   * @param {*} value
   */
  constructor(value) {
    this.value = value;
    /** @type {CircularNode|null} */
    this.next = null;
  }
}

/**
 * Lista circular simple implementada desde cero.
 * El último nodo apunta al primero. Incluye un cursor para recorrerla
 * cíclicamente, que se usa para controlar los pases del mazo.
 *
 * @template T
 */
export class CircularList {
  /** @type {CircularNode|null} */
  #tail = null;
  /** @type {CircularNode|null} */
  #cursor = null;
  /** @type {number} */
  #size = 0;

  /**
   * Inserta al inicio.
   *
   * @param {T} value
   * @returns {this}
   * @complexity O(1)
   */
  insertAtStart(value) {
    const node = new CircularNode(value);
    if (this.#tail === null) {
      node.next = node;
      this.#tail = node;
      this.#cursor = node;
    } else {
      node.next = this.#tail.next;
      this.#tail.next = node;
    }
    this.#size += 1;
    return this;
  }

  /**
   * Inserta al final.
   *
   * @param {T} value
   * @returns {this}
   * @complexity O(1)
   */
  insertAtEnd(value) {
    const node = new CircularNode(value);
    if (this.#tail === null) {
      node.next = node;
      this.#tail = node;
      this.#cursor = node;
    } else {
      node.next = this.#tail.next;
      this.#tail.next = node;
      this.#tail = node;
    }
    this.#size += 1;
    return this;
  }

  /**
   * Inserta en una posición. La posición puede ser 0 o `size()`.
   *
   * @param {number} index
   * @param {T} value
   * @returns {this}
   * @throws {RangeError} Si la posición está fuera de rango.
   * @complexity O(n)
   */
  insertAt(index, value) {
    if (!Number.isInteger(index) || index < 0 || index > this.#size) {
      throw new RangeError(`Posición inválida: ${index}`);
    }
    if (index === 0) return this.insertAtStart(value);
    if (index === this.#size) return this.insertAtEnd(value);

    let previous = this.#tail.next; // head
    for (let i = 0; i < index - 1; i += 1) previous = previous.next;
    const node = new CircularNode(value);
    node.next = previous.next;
    previous.next = node;
    this.#size += 1;
    if (this.#cursor === null) this.#cursor = node;
    return this;
  }

  /**
   * Elimina el valor de una posición.
   *
   * @param {number} index
   * @returns {T|null}
   * @throws {RangeError} Si la posición está fuera de rango.
   * @complexity O(n)
   */
  removeAt(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#size) {
      throw new RangeError(`Posición inválida: ${index}`);
    }
    if (this.#size === 1) {
      const value = this.#tail.value;
      this.#tail = null;
      this.#cursor = null;
      this.#size = 0;
      return value;
    }

    let node;
    if (index === this.#size - 1) {
      const previous = this.#prevNode(this.#tail);
      node = this.#tail;
      previous.next = node.next;
      this.#tail = previous;
    } else if (index === 0) {
      node = this.#tail.next;
      this.#tail.next = node.next;
    } else {
      const previous = this.#nodeAt(index - 1);
      node = previous.next;
      previous.next = node.next;
    }

    this.#size -= 1;
    if (this.#cursor === node) {
      this.#cursor = this.#size > 0 ? node.next : null;
    }
    node.next = null;
    return node.value;
  }

  /**
   * Elimina la primera ocurrencia de un valor (comparación por referencia).
   *
   * @param {T} value
   * @returns {boolean}
   * @complexity O(n)
   */
  remove(value) {
    if (this.#tail === null) return false;
    if (this.#size === 1) {
      if (this.#tail.value !== value) return false;
      this.#tail = null;
      this.#cursor = null;
      this.#size = 0;
      return true;
    }

    let previous = this.#tail;
    let current = this.#tail.next;
    for (let i = 0; i < this.#size; i += 1) {
      if (current.value === value) {
        previous.next = current.next;
        if (current === this.#tail) this.#tail = previous;
        if (this.#cursor === current) {
          this.#cursor = this.#size > 1 ? current.next : null;
        }
        this.#size -= 1;
        current.next = null;
        return true;
      }
      previous = current;
      current = current.next;
    }
    return false;
  }

  /**
   * Busca un valor y devuelve su posición.
   *
   * @param {T} value
   * @returns {number}
   * @complexity O(n)
   */
  search(value) {
    if (this.#tail === null) return -1;
    let current = this.#tail.next;
    for (let i = 0; i < this.#size; i += 1) {
      if (current.value === value) return i;
      current = current.next;
    }
    return -1;
  }

  /**
   * Devuelve el valor de una posición.
   *
   * @param {number} index
   * @returns {T|null}
   * @complexity O(n)
   */
  get(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#size) return null;
    return this.#nodeAt(index).value;
  }

  /**
   * Recorre la lista completa una vez.
   *
   * @param {(value: T, index: number) => void} callback
   * @returns {void}
   * @complexity O(n)
   */
  traverse(callback) {
    if (this.#tail === null) return;
    let current = this.#tail.next;
    for (let i = 0; i < this.#size; i += 1) {
      callback(current.value, i);
      current = current.next;
    }
  }

  /**
   * Avanza el cursor al siguiente nodo y devuelve su valor.
   *
   * @returns {T|null}
   * @complexity O(1)
   */
  advance() {
    if (this.#tail === null) return null;
    this.#cursor = this.#cursor === null ? this.#tail.next : this.#cursor.next;
    return this.#cursor.value;
  }

  /**
   * Devuelve el valor actual del cursor.
   *
   * @returns {T|null}
   * @complexity O(1)
   */
  current() {
    return this.#cursor === null ? null : this.#cursor.value;
  }

  /**
   * Coloca el cursor en una posición.
   *
   * @param {number} index
   * @returns {T|null}
   * @complexity O(n)
   */
  setCursor(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#size) return null;
    this.#cursor = this.#nodeAt(index);
    return this.#cursor.value;
  }

  /**
   * Coloca el cursor en el primer nodo.
   *
   * @returns {T|null}
   * @complexity O(1)
   */
  resetCursor() {
    this.#cursor = this.#tail === null ? null : this.#tail.next;
    return this.current();
  }

  /**
   * Devuelve una instantánea de la lista.
   *
   * @returns {T[]}
   * @complexity O(n)
   */
  toArray() {
    const values = [];
    this.traverse((value) => values.push(value));
    return values;
  }

  /**
   * Cantidad de elementos.
   *
   * @returns {number}
   * @complexity O(1)
   */
  size() {
    return this.#size;
  }

  /**
   * Indica si la lista está vacía.
   *
   * @returns {boolean}
   * @complexity O(1)
   */
  isEmpty() {
    return this.#size === 0;
  }

  /**
   * Vacía la lista y reinicia el cursor.
   *
   * @returns {void}
   * @complexity O(1)
   */
  clear() {
    this.#tail = null;
    this.#cursor = null;
    this.#size = 0;
  }

  /**
   * @param {number} index
   * @returns {CircularNode}
   * @private
   */
  #nodeAt(index) {
    let current = this.#tail.next;
    for (let i = 0; i < index; i += 1) current = current.next;
    return current;
  }

  /**
   * @param {CircularNode} node
   * @returns {CircularNode}
   * @private
   */
  #prevNode(node) {
    let current = this.#tail.next;
    while (current.next !== node) current = current.next;
    return current;
  }
}
