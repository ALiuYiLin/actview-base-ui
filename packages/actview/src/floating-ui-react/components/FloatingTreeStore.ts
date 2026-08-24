import { shallowRef } from 'actview';
import type { Ref } from 'actview';
import type { FloatingNodeType, FloatingEvents } from '../types';
import { createEventEmitter } from '../utils/createEventEmitter';

/**
 * Stores and manages floating elements in a tree structure.
 * This is a backing store for the `FloatingTree` component.
 */
export class FloatingTreeStore {
  public readonly nodesRef: Ref<Array<FloatingNodeType>> = shallowRef([]);

  public readonly events: FloatingEvents = createEventEmitter();

  public addNode(node: FloatingNodeType) {
    this.nodesRef.value.push(node);
  }

  public removeNode(node: FloatingNodeType) {
    const index = this.nodesRef.value.findIndex((n) => n === node);
    if (index !== -1) {
      this.nodesRef.value.splice(index, 1);
    }
  }
}
