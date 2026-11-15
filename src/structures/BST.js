/**
 * Nodo interno del árbol binario de búsqueda.
 */
class BSTNode {
  /**
   * @param {number} key
   * @param {*} value
   */
  constructor(key, value) {
    this.key = key;
    this.value = value;
    /** @type {BSTNode|null} */
    this.left = null;
    /** @type {BSTNode|null} */
    this.right = null;
  }
}

/**
 * Árbol binario de búsqueda (BST) implementado desde cero.
 * Las claves repetidas se insertan a la derecha para conservar todos los
 * registros del ranking. Incluye los tres recorridos y eliminación.
 *
 * @template T
 */
export class BST {
  /** @type {BSTNode|null} */
  #root = null;
  /** @type {number} */
  #size = 0;

  /**
   * Inserta una clave con su valor.
   * Si la clave ya existe, el nuevo nodo va al subárbol derecho.
   *
   * @param {number} key
   * @param {T} value
   * @returns {this}
   * @complexity O(h) promedio O(log n), peor caso O(n)
   */
  insert(key, value) {
    const node = new BSTNode(key, value);
    if (this.#root === null) {
      this.#root = node;
    } else {
      let current = this.#root;
      while (true) {
        if (key < current.key) {
          if (current.left === null) {
            current.left = node;
            break;
          }
          current = current.left;
        } else {
          if (current.right === null) {
            current.right = node;
            break;
          }
          current = current.right;
        }
      }
    }
    this.#size += 1;
    return this;
  }

  /**
   * Busca una clave y devuelve su valor.
   *
   * @param {number} key
   * @returns {T|null}
   * @complexity O(h) promedio O(log n), peor caso O(n)
   */
  search(key) {
    let current = this.#root;
    while (current !== null) {
      if (key === current.key) return current.value;
      current = key < current.key ? current.left : current.right;
    }
    return null;
  }

  /**
   * Elimina una ocurrencia de una clave.
   *
   * @param {number} key
   * @returns {boolean} `true` si se eliminó.
   * @complexity O(h) promedio O(log n), peor caso O(n)
   */
  delete(key) {
    let deleted = false;

    /**
     * @param {BSTNode|null} node
     * @returns {BSTNode|null}
     */
    const deleteNode = (node) => {
      if (node === null) return null;
      if (key < node.key) {
        node.left = deleteNode(node.left);
      } else if (key > node.key) {
        node.right = deleteNode(node.right);
      } else {
        deleted = true;
        if (node.left === null) return node.right;
        if (node.right === null) return node.left;
        const min = this.#minNode(node.right);
        node.key = min.key;
        node.value = min.value;
        node.right = this.#deleteMin(node.right);
      }
      return node;
    };

    this.#root = deleteNode(this.#root);
    if (deleted) this.#size -= 1;
    return deleted;
  }

  /**
   * Devuelve la entrada con la clave mínima.
   *
   * @returns {{key: number, value: T}|null}
   * @complexity O(h)
   */
  minEntry() {
    if (this.#root === null) return null;
    const node = this.#minNode(this.#root);
    return { key: node.key, value: node.value };
  }

  /**
   * Devuelve la entrada con la clave máxima.
   *
   * @returns {{key: number, value: T}|null}
   * @complexity O(h)
   */
  maxEntry() {
    if (this.#root === null) return null;
    let current = this.#root;
    while (current.right !== null) current = current.right;
    return { key: current.key, value: current.value };
  }

  /**
   * Recorrido inorden (izquierda, raíz, derecha). Devuelve las claves ordenadas.
   *
   * @param {(key: number, value: T) => void} callback
   * @returns {void}
   * @complexity O(n)
   */
  inOrder(callback) {
    const visit = (node) => {
      if (node === null) return;
      visit(node.left);
      callback(node.key, node.value);
      visit(node.right);
    };
    visit(this.#root);
  }

  /**
   * Recorrido preorden (raíz, izquierda, derecha).
   *
   * @param {(key: number, value: T) => void} callback
   * @returns {void}
   * @complexity O(n)
   */
  preOrder(callback) {
    const visit = (node) => {
      if (node === null) return;
      callback(node.key, node.value);
      visit(node.left);
      visit(node.right);
    };
    visit(this.#root);
  }

  /**
   * Recorrido posorden (izquierda, derecha, raíz).
   *
   * @param {(key: number, value: T) => void} callback
   * @returns {void}
   * @complexity O(n)
   */
  postOrder(callback) {
    const visit = (node) => {
      if (node === null) return;
      visit(node.left);
      visit(node.right);
      callback(node.key, node.value);
    };
    visit(this.#root);
  }

  /**
   * Devuelve una instantánea según el recorrido indicado.
   *
   * @param {'in'|'pre'|'post'} order
   * @returns {Array<{key: number, value: T}>}
   * @complexity O(n)
   */
  toArray(order = 'in') {
    const result = [];
    const collect = (key, value) => result.push({ key, value });
    if (order === 'pre') this.preOrder(collect);
    else if (order === 'post') this.postOrder(collect);
    else this.inOrder(collect);
    return result;
  }

  /**
   * Altura del árbol (un árbol vacío tiene altura 0).
   *
   * @returns {number}
   * @complexity O(n)
   */
  height() {
    const measure = (node) => {
      if (node === null) return 0;
      return 1 + Math.max(measure(node.left), measure(node.right));
    };
    return measure(this.#root);
  }

  /**
   * Cantidad de nodos.
   *
   * @returns {number}
   * @complexity O(1)
   */
  size() {
    return this.#size;
  }

  /**
   * Indica si el árbol está vacío.
   *
   * @returns {boolean}
   * @complexity O(1)
   */
  isEmpty() {
    return this.#size === 0;
  }

  /**
   * Vacía el árbol.
   *
   * @returns {void}
   * @complexity O(1)
   */
  clear() {
    this.#root = null;
    this.#size = 0;
  }

  /**
   * @param {BSTNode} node
   * @returns {BSTNode}
   * @private
   */
  #minNode(node) {
    let current = node;
    while (current.left !== null) current = current.left;
    return current;
  }

  /**
   * @param {BSTNode} node
   * @returns {BSTNode|null}
   * @private
   */
  #deleteMin(node) {
    if (node.left === null) return node.right;
    node.left = this.#deleteMin(node.left);
    return node;
  }
}
