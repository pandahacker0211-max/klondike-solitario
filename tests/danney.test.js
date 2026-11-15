import { test, assertEquals, assertTrue, assertFalse, assertNull, assertThrows } from './test-runner.js';
import { Stack } from '../src/structures/Stack.js';
import { Queue } from '../src/structures/Queue.js';
import { DoublyLinkedList } from '../src/structures/DoublyLinkedList.js';
import { CircularList } from '../src/structures/CircularList.js';
import { BST } from '../src/structures/BST.js';

// ---------------------------------------------------------------------------
// Pruebas de refuerzo de las estructuras.
// Este archivo es independiente de la suite principal: se ejecuta desde
// tests/danney.html y no modifica las 40 pruebas del proyecto.
// ---------------------------------------------------------------------------

test('Pila: reutilizar después de vaciarla', () => {
  const stack = new Stack();
  stack.push('A');
  assertEquals(stack.pop(), 'A');
  assertTrue(stack.isEmpty());
  assertNull(stack.peek());

  stack.push('B').push('C');
  assertEquals(stack.size(), 2);
  assertEquals(stack.peek(), 'C');
  assertEquals(stack.toArray(), ['B', 'C']);

  assertEquals(stack.pop(), 'C');
  assertEquals(stack.pop(), 'B');
  assertNull(stack.pop());
  assertTrue(stack.isEmpty());
  assertEquals(stack.size(), 0);
});

test('Cola: reutilizar después de vaciarla', () => {
  const queue = new Queue();
  queue.enqueue('primero');
  assertEquals(queue.dequeue(), 'primero');
  assertTrue(queue.isEmpty());
  assertNull(queue.front());
  assertNull(queue.dequeue());

  queue.enqueue(1).enqueue(2).enqueue(3);
  assertEquals(queue.size(), 3);
  assertEquals(queue.front(), 1);
  assertEquals(queue.toArray(), [1, 2, 3]);

  assertEquals(queue.dequeue(), 1);
  assertEquals(queue.dequeue(), 2);
  assertEquals(queue.dequeue(), 3);
  assertNull(queue.dequeue());
  assertTrue(queue.isEmpty());
});

test('Lista circular: extremos, cursor y vuelta completa', () => {
  const list = new CircularList();
  list.insertAtStart(2);
  list.insertAtStart(1);
  list.insertAtEnd(3);
  assertEquals(list.toArray(), [1, 2, 3]);
  assertEquals(list.size(), 3);

  assertEquals(list.setCursor(0), 1);
  assertEquals(list.advance(), 2);
  assertEquals(list.advance(), 3);
  assertEquals(list.advance(), 1);
  assertEquals(list.current(), 1);

  assertEquals(list.setCursor(2), 3);
  assertEquals(list.advance(), 1);

  assertEquals(list.removeAt(2), 3);
  assertEquals(list.toArray(), [1, 2]);
  assertTrue(list.remove(1));
  assertFalse(list.remove(99));
  assertEquals(list.toArray(), [2]);
  assertEquals(list.search(2), 0);
  assertEquals(list.search(99), -1);
  assertEquals(list.get(99), null);
  assertEquals(list.setCursor(99), null);
  assertEquals(list.current(), 2);

  assertEquals(list.removeAt(0), 2);
  assertTrue(list.isEmpty());
  assertNull(list.advance());
  assertNull(list.current());
  assertNull(list.resetCursor());
});

test('Lista doble: insertar, quitar y dividir en los extremos', () => {
  const list = new DoublyLinkedList();
  list.insertAtEnd(2);
  list.insertAtStart(1);
  list.insertAtEnd(3);
  list.insertAt(3, 4);
  assertEquals(list.toArray(), [1, 2, 3, 4]);
  assertEquals(list.size(), 4);

  assertEquals(list.removeAt(0), 1);
  assertEquals(list.removeAt(list.size() - 1), 4);
  assertEquals(list.toArray(), [2, 3]);

  const backward = [];
  list.traverseBackward((value) => backward.push(value));
  assertEquals(backward, [3, 2]);

  const tail = list.splitFrom(0);
  assertEquals(list.toArray(), []);
  assertEquals(list.size(), 0);
  assertEquals(tail.toArray(), [2, 3]);
  assertEquals(tail.size(), 2);

  const emptyTail = tail.splitFrom(tail.size());
  assertEquals(emptyTail.toArray(), []);
  assertEquals(tail.toArray(), [2, 3]);

  assertFalse(tail.remove(99));
  assertNull(tail.get(-1));
  assertNull(tail.get(99));
  assertThrows(() => tail.insertAt(99, 9), RangeError);
});

test('BST: árbol vacío, búsqueda inexistente y clear', () => {
  const tree = new BST();
  assertEquals(tree.height(), 0);
  assertEquals(tree.size(), 0);
  assertTrue(tree.isEmpty());
  assertNull(tree.search(50));
  assertNull(tree.minEntry());
  assertNull(tree.maxEntry());
  assertFalse(tree.delete(50));
  assertEquals(tree.toArray(), []);

  tree.insert(8, 'ocho').insert(3, 'tres').insert(10, 'diez');
  tree.insert(1, 'uno').insert(6, 'seis').insert(14, 'catorce');
  tree.insert(4, 'cuatro').insert(7, 'siete').insert(13, 'trece');
  assertEquals(tree.height(), 4);
  assertEquals(tree.size(), 9);
  assertNull(tree.search(0));
  assertNull(tree.search(99));
  assertEquals(tree.search(14), 'catorce');
  assertFalse(tree.delete(99));

  tree.clear();
  assertEquals(tree.height(), 0);
  assertEquals(tree.size(), 0);
  assertTrue(tree.isEmpty());
  assertNull(tree.search(8));
  assertEquals(tree.toArray(), []);
});

test('BST: las claves repetidas se conservan en orden', () => {
  const tree = new BST();
  tree.insert(5, 'a').insert(3, 'b').insert(5, 'c').insert(5, 'd').insert(4, 'e');
  assertEquals(tree.size(), 5);
  assertEquals(tree.height(), 3);

  const entries = tree.toArray('in');
  assertEquals(entries.map((item) => item.key), [3, 4, 5, 5, 5]);
  assertEquals(entries.map((item) => item.value), ['b', 'e', 'a', 'c', 'd']);
  assertEquals(tree.minEntry().value, 'b');
  assertEquals(tree.maxEntry().value, 'd');

  assertTrue(tree.delete(5));
  assertEquals(tree.size(), 4);
  assertEquals(tree.toArray('in').map((item) => item.key), [3, 4, 5, 5]);
  assertEquals(tree.search(5), 'c');

  assertTrue(tree.delete(5));
  assertEquals(tree.size(), 3);
  assertEquals(tree.toArray('in').map((item) => item.key), [3, 4, 5]);
  assertFalse(tree.delete(99));

  tree.clear();
  assertTrue(tree.isEmpty());
  assertEquals(tree.toArray(), []);
});
