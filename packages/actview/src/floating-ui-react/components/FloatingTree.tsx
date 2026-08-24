import { createContext, defineComponent, ref, watch } from 'actview';
import type { Ref } from 'actview';
import { useId } from '@/utils/useId';
import { useRefWithInit } from '@/utils/useRefWithInit';
import type { FloatingNodeType, FloatingTreeType } from '../types';
import { FloatingTreeStore } from './FloatingTreeStore';

const FloatingNodeContext = createContext<FloatingNodeType | null>(null);
const FloatingTreeContext = createContext<FloatingTreeType | null>(null);

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
export function useFloatingNodeId(externalTree?: FloatingTreeStore): Ref<string | undefined> {
  const id = useId();
  const tree = useFloatingTree(externalTree);
  const parentId = useFloatingParentNodeId();

  watch(
    () => [tree, id, parentId] as const,
    () => {
      if (!id) {
        return;
      }

      const node = {id, parentId};
      tree?.addNode(node);
      return () => {
        tree?.removeNode(node);
      };
    },
    {flush: 'post', immediate: true},
  );

  const idRef = ref<string | undefined>(id);
  return idRef;
}

export interface FloatingNodeProps {
  children?: any;
  id: string | undefined;
}

/**
 * Provides parent node context for nested floating elements.
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export const FloatingNode = defineComponent(function (props: FloatingNodeProps) {
  const {children, id} = props;

  const parentId = useFloatingParentNodeId();

  return () => (
    <FloatingNodeContext.Provider value={{id, parentId}}>{children}</FloatingNodeContext.Provider>
  );
});

export interface FloatingTreeProps {
  children?: any;
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Provides context for nested floating elements when they are not children of
 * each other on the DOM.
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export const FloatingTree = defineComponent(function (props: FloatingTreeProps) {
  const {children, externalTree} = props;

  const tree = useRefWithInit(() => externalTree ?? new FloatingTreeStore()).value;

  return () => (
    <FloatingTreeContext.Provider value={tree}>{children}</FloatingTreeContext.Provider>
  );
});
