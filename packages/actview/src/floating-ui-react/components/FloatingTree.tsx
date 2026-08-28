import { createContext, ref, watch } from 'actview';
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
 * (store-as-is：use() 原样返回载体——直读字段，不读 `.value`。)
 */
export const useFloatingParentNodeId = (): string | null =>
  FloatingNodeContext.use()?.id || null;

/**
 * Returns the nearest floating tree context, if available.
 */
export const useFloatingTree = (externalTree?: FloatingTreeStore): FloatingTreeType | null => {
  const contextTree = FloatingTreeContext.use() as FloatingTreeType | null;
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
 */
export function FloatingNode(props: FloatingNodeProps) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const parentId = useFloatingParentNodeId();

  // store-as-is 载体：身份稳定 getter 对象（渲染期新对象会冻结消费端快照）——
  // id 渲染期求值；children 渲染期直读（setup 快照会让动态子树停留首次渲染）。
  const payload = {
    get id() {
      return props.id;
    },
    parentId,
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <FloatingNodeContext.Provider value={payload}>{props.children}</FloatingNodeContext.Provider>
  );
}

export interface FloatingTreeProps {
  children?: any;
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Provides context for nested floating elements when they are not children of
 * each other on the DOM.
 * @see https://floating-ui.com/docs/FloatingTree
 */
export function FloatingTree(props: FloatingTreeProps) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // store 标识初始化型快照（React useRefWithInit 同语义，初始化后不随 prop 变化）。
  const externalTree = props.externalTree;
  const tree = useRefWithInit(() => externalTree ?? new FloatingTreeStore()).value;

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 渲染期直读（setup 快照会让动态 children——如条件渲染的
  // Trigger——永远停留首次渲染）。
  return (
    <FloatingTreeContext.Provider value={tree}>{props.children}</FloatingTreeContext.Provider>
  );
}
