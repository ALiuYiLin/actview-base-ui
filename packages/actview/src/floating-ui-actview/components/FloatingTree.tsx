import { computed, onMounted, onUnmounted } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { useId } from '@base-ui/actview-utils/useId';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { createContext } from '@/internals/createContext';
import type { FloatingNodeType, FloatingTreeType } from '@/floating-ui-actview/types';
import { FloatingTreeStore } from '@/floating-ui-actview/components/FloatingTreeStore';

const FloatingNodeContext = createContext<FloatingNodeType | null>(
  'base-ui-floating-node-context',
  null,
);
const FloatingTreeContext = createContext<FloatingTreeType | null>(
  'base-ui-floating-tree-context',
  null,
);

/**
 * Returns the parent node id for nested floating elements, if available.
 * Returns `null` for top-level floating elements.
 */
export const useFloatingParentNodeId = (): string | null =>
  FloatingNodeContext.use().value?.id || null;

/**
 * Returns the nearest floating tree context, if available.
 */
export const useFloatingTree = (externalTree?: FloatingTreeStore): FloatingTreeType | null => {
  const contextTree = FloatingTreeContext.use().value as FloatingTreeType | null;
  return externalTree ?? contextTree;
};

/**
 * Registers a node into the `FloatingTree`, returning its id.
 * @see https://floating-ui.com/docs/FloatingTree
 */
export function useFloatingNodeId(externalTree?: FloatingTreeStore): string | undefined {
  const id = useId();
  const tree = useFloatingTree(externalTree);
  const parentId = useFloatingParentNodeId();
  const node = { id, parentId };

  onMounted(() => {
    if (id) {
      tree?.addNode(node);
    }
  });

  onUnmounted(() => {
    if (id) {
      tree?.removeNode(node);
    }
  });

  return id;
}

export interface FloatingNodeProps {
  children?: VNodeChild;
  id: string | undefined;
}

/**
 * Provides parent node context for nested floating elements.
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export function FloatingNode(props: FloatingNodeProps) {
  const parentId = useFloatingParentNodeId();

  return (
    <FloatingNodeContext.Provider value={computed(() => ({ id: props.id, parentId }))}>
      {props.children}
    </FloatingNodeContext.Provider>
  );
}

export interface FloatingTreeProps {
  children?: VNodeChild;
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Provides context for nested floating elements when they are not children of
 * each other on the DOM.
 * This is not necessary in all cases, except when there must be explicit communication between parent and child floating elements. It is necessary for:
 * - The `bubbles` option in the `useDismiss()` Hook
 * - Nested virtual list navigation
 * - Nested floating elements that each open on hover
 * - Custom communication between parent and child floating elements
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export function FloatingTree(props: FloatingTreeProps) {
  const tree = useRefWithInit(() => props.externalTree ?? new FloatingTreeStore()).current;
  return <FloatingTreeContext.Provider value={tree}>{props.children}</FloatingTreeContext.Provider>;
}
