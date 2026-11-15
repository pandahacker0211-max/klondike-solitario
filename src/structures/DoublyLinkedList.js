/**
 * Nodo interno de la lista doblemente enlazada.
 */
class DoublyNode {
  /**
   * @param {*} value
   */
  constructor(value) {
    this.value = value;
    /** @type {DoublyNode|null} */
    this.prev = null;
    /** @type {DoublyNode|null} */
    this.next = null;
  }
}

/**
 * Lista doblemente enlazada implementada desde cero.
 * Permite recorrerla hacia adelante y hacia atrás, insertar en cualquier
 * posición, eliminar, buscar y dividir la lista desde una posición.
 *
 * @template T
 */
export class DoublyLinkedList {
  /** @type {DoublyNode|null} */
  #head = null;
  /** @type {DoublyNode|null} */
  #tail = null;
  /** @type {number} */
  #size = 0;

  /**
   * Inserta un valor al inicio.
   *
   * @param {T} value
   * @returns {this}
   * @complexity O(1)
   */
  insertAtStart(value) {
    const node = new DoublyNode(value);
    if (this.#head === null) {
      this.#head = node;
      this.#tail = node;
    } else {
      node.next = this.#head;
      this.#head.prev = node;
      this.#head = node;
    }
    this.#size += 1;
    return this;
  }

  /**
   * Inserta un valor al final.
   *
   * @param {T} value
   * @returns {this}
   * @complexity O(1)
   */
  insertAtEnd(value) {
    const node = new DoublyNode(value);
    if (this.#tail === null) {
      this.#head = node;
      this.#tail = node;
    } else {
      node.prev = this.#tail;
      this.#tail.next = node;
      this.#tail = node;
    }
    this.#size += 1;
    return this;
  }

  /**
   * Inserta un valor en una posición.
   * La posición puede ser 0 (inicio) o `size()` (final).
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

    const next = this.#nodeAt(index);
    const previous = next.prev;
    const node = new DoublyNode(value);
    node.prev = previous;
    node.next = next;
    previous.next = node;
    next.prev = node;
    this.#size += 1;
    return this;
  }

  /**
   * Elimina el valor de una posición.
   *
   * @param {number} index
   * @returns {T|null} El valor eliminado o `null` si no existe.
   * @throws {RangeError} Si la posición está fuera de rango.
   * @complexity O(n)
   */
  removeAt(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#size) {
      throw new RangeError(`Posición inválida: ${index}`);
    }
    const node = this.#nodeAt(index);
    const value = node.value;
    this.#detach(node);
    return value;
  }

  /**
   * Elimina la primera ocurrencia de un valor (comparación por referencia).
   *
   * @param {T} value
   * @returns {boolean} `true` si se encontró y eliminó.
   * @complexity O(n)
   */
  remove(value) {
    let current = this.#head;
    while (current !== null) {
      if (current.value === value) {
        this.#detach(current);
        return true;
      }
      current = current.next;
    }
    return false;
  }

  /**
   * Busca un valor y devuelve su posición.
   *
   * @param {T} value
   * @returns {number} Índice o `-1` si no está.
   * @complexity O(n)
   */
  search(value) {
    let current = this.#head;
    let index = 0;
    while (current !== null) {
      if (current.value === value) return index;
      current = current.next;
      index += 1;
    }
    return -1;
  }

  /**
   * Devuelve el valor de una posición sin eliminarlo.
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
   * Recorre la lista de inicio a fin.
   *
   * @param {(value: T, index: number) => void} callback
   * @returns {void}
   * @complexity O(n)
   */
  traverseForward(callback) {
    let current = this.#head;
    let index = 0;
    while (current !== null) {
      callback(current.value, index);
      current = current.next;
      index += 1;
    }
  }

  /**
   * Recorre la lista de fin a inicio.
   *
   * @param {(value: T, index: number) => void} callback
   * @returns {void}
   * @complexity O(n)
   */
  traverseBackward(callback) {
    let current = this.#tail;
    let index = this.#size - 1;
    while (current !== null) {
      callback(current.value, index);
      current = current.prev;
      index -= 1;
    }
  }

  /**
   * Devuelve una instantánea de la lista, de inicio a fin.
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

  /**
   * Separa la lista desde una posición y devuelve la parte final como una
   * lista nueva. La lista original conserva los elementos anteriores.
   *
   * @param {number} index
   * @returns {DoublyLinkedList}
   * @throws {RangeError} Si la posición está fuera de rango.
   * @complexity O(n)
   */
  splitFrom(index) {
    if (!Number.isInteger(index) || index < 0 || index > this.#size) {
      throw new RangeError(`Posición inválida: ${index}`);
    }
    const result = new DoublyLinkedList();
    if (index === this.#size) return result;

    const node = this.#nodeAt(index);
    const oldTail = this.#tail;
    const oldSize = this.#size;
    const previous = node.prev;

    if (previous === null) {
      this.#head = null;
      this.#tail = null;
    } else {
      previous.next = null;
      this.#tail = previous;
    }
    node.prev = null;

    result.#head = node;
    result.#tail = oldTail;
    result.#size = oldSize - index;
    this.#size = index;
    return result;
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
   * Vacía la lista.
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
   * Obtiene el nodo de una posición. Se recorre desde el extremo más cercano.
   *
   * @param {number} index
   * @returns {DoublyNode}
   * @private
   */
  #nodeAt(index) {
    if (index < this.#size / 2) {
      let current = this.#head;
      for (let i = 0; i < index; i += 1) current = current.next;
      return current;
    }
    let current = this.#tail;
    for (let i = this.#size - 1; i > index; i -= 1) current = current.prev;
    return current;
  }

  /**
   * Desconecta un nodo de la lista y actualiza los extremos.
   *
   * @param {DoublyNode} node
   * @returns {void}
   * @private
   */
  #detach(node) {
    if (node.prev === null) this.#head = node.next;
    else node.prev.next = node.next;

    if (node.next === null) this.#tail = node.prev;
    else node.next.prev = node.prev;

    node.prev = null;
    node.next = null;
    this.#size -= 1;
  }
}
