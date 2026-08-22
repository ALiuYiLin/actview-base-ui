import { computed, onMounted, onUnmounted, ref, shallowRef, unref, watch } from 'actview';
import {
  autoUpdate,
  computePosition,
  type ComputePositionConfig,
  type MiddlewareData,
  type Placement,
  type Strategy,
} from '@floating-ui/dom';
import { isElement } from '@floating-ui/utils/dom';
import { FloatingRootStore } from '@/floating-ui-actview/components/FloatingRootStore';
import { useFloatingTree } from '@/floating-ui-actview/components/FloatingTree';
import type {
  ExtendedElements,
  ExtendedRefs,
  FloatingContext,
  NarrowedElement,
  ReferenceType,
  UseFloatingOptions,
  UseFloatingReturn,
  VirtualElement,
} from '@/floating-ui-actview/types';
import { useFloatingRootContext } from '@/floating-ui-actview/hooks/useFloatingRootContext';

/**
 * Provides data to position a floating element and context to add interactions.
 * @see https://floating-ui.com/docs/useFloating
 */
export function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const internalStore = useFloatingRootContext(options);
  const store = options.rootContext || internalStore;

  return useFloatingWithStore(options, store);
}

/**
 * Base UI's private `useFloating` path. The caller must supply the root store, so this skips the
 * internal root-context hook used by the public Floating UI-compatible API.
 */
export function useBaseUIFloating(
  options: UseFloatingOptions & { rootContext: FloatingRootStore },
): UseFloatingReturn {
  return useFloatingWithStore(options, options.rootContext);
}

function useFloatingWithStore(
  options: UseFloatingOptions,
  store: FloatingRootStore,
): UseFloatingReturn {
  const { nodeId, externalTree } = options;

  const storeReferenceElement = store.useState('referenceElement');
  const storeFloatingElement = store.useState('floatingElement');
  const storeDomReferenceElement = store.useState('domReferenceElement');
  const open = store.useState('open');
  const floatingId = store.useState('floatingId');

  const positionReference = shallowRef<ReferenceType | null>(null);
  const localDomReference = shallowRef<NarrowedElement<ReferenceType> | null | undefined>(
    undefined,
  );
  const localFloatingElement = shallowRef<HTMLElement | null | undefined>(undefined);

  // The elements set directly through `refs.setReference` / `refs.setFloating`.
  const positioningReferenceEl = shallowRef<ReferenceType | null>(null);
  const positioningFloatingEl = shallowRef<HTMLElement | null>(null);

  const domReferenceRef: { current: NarrowedElement<ReferenceType> | null } = { current: null };

  const tree = useFloatingTree(externalTree);

  // The elements used for positioning. The reference is overridden by an explicit
  // position reference (from `refs.setPositionReference`) before falling back to the
  // store reference and finally the ref set via `refs.setReference`.
  const referenceEl = computed<ReferenceType | null>(
    () => positionReference.value || storeReferenceElement.value || positioningReferenceEl.value,
  );
  const floatingEl = computed<HTMLElement | null>(
    () => storeFloatingElement.value || positioningFloatingEl.value,
  );

  // Positioning result, reactive so consumers re-render when it changes.
  const x = ref(0);
  const y = ref(0);
  const placement = ref<Placement>(options.placement ?? 'bottom');
  const strategy = ref<Strategy>(options.strategy ?? 'absolute');
  const middlewareData = shallowRef<MiddlewareData>({});
  const isPositioned = ref(false);

  const update = () => {
    const reference = referenceEl.value;
    const floating = floatingEl.value;

    if (!reference || !floating) {
      return;
    }

    const config: Partial<ComputePositionConfig> = {
      placement: options.placement ?? 'bottom',
      strategy: options.strategy ?? 'absolute',
      middleware: options.middleware ?? [],
    };

    if (options.platform) {
      config.platform = options.platform;
    }

    computePosition(reference, floating, config).then((data) => {
      x.value = data.x;
      y.value = data.y;
      placement.value = data.placement;
      strategy.value = data.strategy;
      middlewareData.value = data.middlewareData;
      isPositioned.value = unref(options.open) !== false;
    });
  };

  const floatingStyles = computed<Record<string, string | number>>(() => {
    const result: Record<string, string | number> = {
      position: strategy.value,
      left: 0,
      top: 0,
    };

    const floating = floatingEl.value;
    if (!floating) {
      return result;
    }

    const currentX = x.value;
    const currentY = y.value;

    if (options.transform ?? true) {
      result.transform = `translate(${currentX}px, ${currentY}px)`;
    } else {
      result.left = currentX;
      result.top = currentY;
    }

    return result;
  });

  let stopAutoUpdate: (() => void) | null = null;

  function stopAutoUpdateIfNeeded() {
    stopAutoUpdate?.();
    stopAutoUpdate = null;
  }

  function runAutoUpdate() {
    stopAutoUpdateIfNeeded();

    if (unref(options.open) === false) {
      isPositioned.value = false;
      return;
    }

    const reference = referenceEl.value;
    const floating = floatingEl.value;
    if (!reference || !floating) {
      return;
    }

    const whileMounted = options.whileElementsMounted ?? autoUpdate;
    const result = whileMounted(reference, floating, update);
    if (typeof result === 'function') {
      stopAutoUpdate = result;
    }
  }

  // Recompute/attach scroll+resize listeners whenever the elements, open state or the
  // position-relevant options change.
  watch(
    [
      referenceEl,
      floatingEl,
      () => unref(options.open),
      () => options.placement,
      () => options.strategy,
      () => options.middleware,
      () => options.platform,
    ],
    runAutoUpdate,
    { immediate: true },
  );

  onUnmounted(stopAutoUpdateIfNeeded);

  const setPositionReference = (node: ReferenceType | null) => {
    const computedPositionReference = isElement(node)
      ? ({
          getBoundingClientRect: () => node.getBoundingClientRect(),
          getClientRects: () => node.getClientRects(),
          contextElement: node,
        } satisfies VirtualElement)
      : node;
    // Store the positionReference in state if the DOM reference is specified externally via the
    // `elements.reference` option. This ensures that it won't be overridden on future renders.
    positionReference.value = computedPositionReference;
    positioningReferenceEl.value = computedPositionReference;
  };

  const setReference = (node: ReferenceType | null) => {
    if (isElement(node) || node === null) {
      domReferenceRef.current = node as NarrowedElement<ReferenceType> | null;
      localDomReference.value = node as NarrowedElement<ReferenceType> | null;
    }

    // Backwards-compatibility for passing a virtual element to `reference`
    // after it has set the DOM reference.
    const current = positioningReferenceEl.value;
    if (
      isElement(current) ||
      current === null ||
      // Don't allow setting virtual elements using the old technique back to
      // `null` to support `positionReference` + an unstable `reference`
      // callback ref.
      (node !== null && !isElement(node))
    ) {
      positioningReferenceEl.value = node;
    }
  };

  const setFloating = (node: HTMLElement | null) => {
    localFloatingElement.value = node;
    positioningFloatingEl.value = node;
  };

  // Keep the store state synced from the local/external elements.
  const localDomReferenceElement = computed<Element | null>(() =>
    isElement(localDomReference.value) ? (localDomReference.value as Element) : null,
  );
  const syncedFloatingElement = computed<HTMLElement | null>(() =>
    localFloatingElement.value === undefined
      ? store.state.floatingElement
      : localFloatingElement.value,
  );

  store.useSyncedValue('referenceElement', computed(() => localDomReference.value ?? null));
  store.useSyncedValue(
    'domReferenceElement',
    computed(() =>
      localDomReference.value === undefined
        ? storeDomReferenceElement.value
        : localDomReferenceElement.value,
    ),
  );
  store.useSyncedValue('floatingElement', syncedFloatingElement);

  const refs: ExtendedRefs = {
    reference: { current: null },
    floating: { current: null },
    domReference: domReferenceRef,
    setReference,
    setFloating,
    setPositionReference,
  };

  // Keep the `{ current }` ref objects in sync with the live elements for consumers that read
  // `refs.reference.current` / `refs.floating.current`.
  watch(
    [referenceEl, floatingEl],
    ([reference, floating]) => {
      refs.reference.current = reference;
      refs.floating.current = floating;
    },
    { immediate: true },
  );

  const elements: ExtendedElements = {
    get reference(): ReferenceType | null {
      return referenceEl.value;
    },
    get floating(): HTMLElement | null {
      return floatingEl.value;
    },
    get domReference(): NarrowedElement<ReferenceType> | null {
      return storeDomReferenceElement.value;
    },
  };

  const context: FloatingContext = {
    x,
    y,
    placement,
    strategy,
    middlewareData,
    isPositioned,
    update,
    floatingStyles,
    dataRef: store.context.dataRef,
    open,
    onOpenChange: store.setOpen,
    events: store.context.events,
    floatingId: floatingId.value,
    refs,
    elements,
    nodeId,
    rootStore: store,
  };

  store.context.dataRef.current.floatingContext = context;

  onMounted(() => {
    store.context.dataRef.current.floatingContext = context;

    const node = tree?.nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.context = context;
    }
  });

  return {
    x,
    y,
    placement,
    strategy,
    middlewareData,
    isPositioned,
    update,
    floatingStyles,
    context,
    refs,
    elements,
    rootStore: store as unknown as FloatingRootStore,
  } as UseFloatingReturn;
}
