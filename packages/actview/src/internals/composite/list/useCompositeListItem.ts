import { computed, onUnmounted, ref as refState, toValue } from 'actview';
import type { ComputedRef } from 'actview';
import { useCompositeListContext } from './CompositeListContext';

export interface UseCompositeListItemParameters<Metadata> {
  /**
   * Whether to guess the initial index from render order, avoiding a re-render after mount for
   * flat lists.
   * @default false
   */
  guess?: boolean | undefined;
  index?: number | undefined;
  label?: string | null | undefined;
  /**
   * Metadata published with the item. Keep object values referentially stable to avoid
   * unnecessarily detaching and reattaching the callback ref.
   */
  metadata?: Metadata | undefined;
  /** Keep the ref object stable to avoid unnecessarily reattaching the item. */
  textRef?: {value: HTMLElement | null} | undefined;
}

interface UseCompositeListItemReturnValue {
  ref: (node: HTMLElement | null) => void;
  index: ComputedRef<number>;
}

/**
 * Used to register a list item and its index (DOM position) in the `CompositeList`.
 */
export function useCompositeListItem<Metadata>(
  params: UseCompositeListItemParameters<Metadata> = {},
): UseCompositeListItemReturnValue {
  const {guess, label, metadata, textRef, index: externalIndex} = params;

  const {register, unregister, subscribeMapChange, nextIndexRef} = toValue(
    useCompositeListContext(),
  );

  // Guess the index from the render order. This avoids a re-render after mount for
  // flat lists rendered in DOM order; when the guess is wrong (grouped or out-of-order
  // rendering), the commit flush corrects it before paint.
  const indexRef = refState(-1);
  const internalIndex = refState<number>(
    externalIndex == null && guess
      ? (() => {
          if (indexRef.value === -1) {
            const newIndex = nextIndexRef.value;
            nextIndexRef.value += 1;
            indexRef.value = newIndex;
          }
          return indexRef.value;
        })()
      : -1,
  );
  const index = computed(() => externalIndex ?? internalIndex.value);

  const componentRef = refState<Element | null>(null);

  // Deliberately identity-sensitive: nested items sharing one DOM node rely on ref attachment
  // order to decide which registration wins, and republishing from an effect instead would let
  // an inner item's later update silently take ownership from the outer one.
  const ref = (node: HTMLElement | null) => {
    const previousNode = componentRef.value;

    if (previousNode) {
      unregister(previousNode);
    }

    componentRef.value = node;

    if (node) {
      register(node, {
        metadata: metadata ?? null,
        index: externalIndex ?? null,
        label,
        textRef,
      });
    }
  };

  // React 版仅在 externalIndex == null 时订阅 map 变化——Accordion 场景
  // 不传外部 index，无条件订阅即可（组件卸载时 onUnmounted 注销）。
  onUnmounted(
    subscribeMapChange((map) => {
      const i = componentRef.value ? map.get(componentRef.value)?.index : null;

      if (i != null) {
        internalIndex.value = i;
      }
    }),
  );

  return {ref, index};
}
