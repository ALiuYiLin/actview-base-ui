import { computed, ref, toValue, watch } from 'actview';
import { useFloating as usePosition } from '@floating-ui/actview';
import { isElement } from '@floating-ui/utils/dom';
import type { FloatingRootStore } from '../components/FloatingRootStore';
import { useFloatingTree } from '../components/FloatingTree';
import type { FloatingContext, ReferenceType } from '../types';

export type UseFloatingOptions = {
  placement?: any;
  strategy?: any;
  middleware?: any[];
  platform?: any;
  elements?: {
    reference?: ReferenceType | null | any;
    floating?: HTMLElement | null | any;
  } | undefined;
  transform?: boolean | undefined;
  whileElementsMounted?: ((reference: any, floating: HTMLElement, update: () => void) => () => void) | undefined;
  open?: boolean | any | undefined;
  nodeId?: string | undefined;
  externalTree?: any;
  rootContext?: FloatingRootStore | undefined;
};

/**
 * Base UI's private `useFloating` path. The caller must supply the root store.
 * (actview 版：store 模式；position 字段读 .value。)
 */
export function useBaseUIFloating(
  options: UseFloatingOptions & {rootContext: FloatingRootStore},
): any {
  return useFloatingWithStore(options, options.rootContext);
}

function useFloatingWithStore(
  options: UseFloatingOptions,
  store: FloatingRootStore,
): any {
  const {nodeId, externalTree} = options;

  const referenceElement = store.useState('referenceElement');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const open = store.useState('open');
  const floatingId = store.useState('floatingId');

  const positionReference = ref<ReferenceType | null>(null);
  const localDomReference = ref<Element | null | undefined>(undefined);
  const localFloatingElement = ref<HTMLElement | null | undefined>(undefined);

  const domReferenceRef = {current: null as Element | null};

  const tree = useFloatingTree(externalTree);

  const position = usePosition({
    ...(options as any),
    elements: {
      reference: referenceElement,
      floating: floatingElement,
      ...(positionReference.value && {reference: positionReference.value as any}),
    },
  } as any);

  const localDomReferenceElement = isElement(localDomReference.value)
    ? (localDomReference.value as Element)
    : null;

  // useSyncedValue 的 value 传 ref/computed：watch 追踪 .value 变化
  // （快照值不会在 setFloating/setReference 后更新 store state）。
  const syncedReferenceElement = computed(() =>
    localDomReference.value === undefined ? null : localDomReference.value,
  );
  const syncedDomReferenceElement = computed(() =>
    localDomReference.value === undefined ? domReferenceElement.value : localDomReference.value,
  );
  const syncedFloatingElement = computed(() =>
    localFloatingElement.value === undefined
      ? store.state.floatingElement
      : localFloatingElement.value,
  );

  store.useSyncedValue('referenceElement', syncedReferenceElement as any);
  store.useSyncedValue('domReferenceElement', syncedDomReferenceElement as any);
  store.useSyncedValue('floatingElement', syncedFloatingElement as any);

  const setPositionReference = (node: ReferenceType | null) => {
    const computedPositionReference = isElement(node)
      ? ({
          getBoundingClientRect: () => (node as Element).getBoundingClientRect(),
          getClientRects: () => (node as Element).getClientRects(),
          contextElement: node,
        } as any)
      : node;
    positionReference.value = computedPositionReference;
    position.refs.setReference(computedPositionReference as any);
  };

  const setReference = (node: ReferenceType | null) => {
    if (isElement(node) || node === null) {
      domReferenceRef.current = node as Element | null;
      localDomReference.value = node as Element | null;
    }

    if (
      isElement(position.refs.reference.value) ||
      position.refs.reference.value === null ||
      (node !== null && !isElement(node))
    ) {
      position.refs.setReference(node as any);
    }
  };

  const setFloating = (node: HTMLElement | null) => {
    localFloatingElement.value = node;
    position.refs.setFloating(node);
  };

  const refs = {
    ...(position.refs as any),
    setReference,
    setFloating,
    setPositionReference,
    domReference: domReferenceRef,
  };

  const elements = {
    ...(position.elements as any),
    domReference: domReferenceElement,
  };

  const context: FloatingContext = {
    ...(position as any),
    dataRef: store.context.dataRef,
    open,
    onOpenChange: store.setOpen,
    events: store.context.events,
    floatingId,
    refs: refs as any,
    elements: elements as any,
    nodeId,
    rootStore: store,
  };

  watch(
    () => domReferenceElement.value,
    () => {
      if (domReferenceElement.value) {
        domReferenceRef.current = domReferenceElement.value as Element | null;
      }
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [tree, nodeId, store] as const,
    () => {
      store.context.dataRef.current.floatingContext = context;

      const node = tree?.nodesRef.current.find((n) => n.id === nodeId);
      if (node) {
        node.context = context;
      }
    },
    {flush: 'post', immediate: true},
  );

  return {
    ...(position as any),
    context,
    refs: refs as any,
    elements: elements as any,
    rootStore: store as unknown as FloatingRootStore,
  } as any;
}
