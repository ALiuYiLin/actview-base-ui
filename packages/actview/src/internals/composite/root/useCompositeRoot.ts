import {ref, computed, toValue, watch, shallowRef} from 'actview';
import { isElementDisabled } from '@/utils/isElementDisabled';
import { useMergedRefs } from '@/utils/useMergedRefs';
import { EMPTY_ARRAY } from '@/internals/noop';
import type { TextDirection } from '@/internals/direction-context/DirectionContext';
import {
  COMPOSITE_KEYS,
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_UP,
  END,
  HOME,
  MODIFIER_KEYS,
  findNonDisabledListIndex,
  getMaxListIndex,
  getMinListIndex,
  isListIndexDisabled,
  isIndexOutOfListBounds,
  isNativeInput,
  scrollIntoViewIfNeeded,
  type ModifierKey,
} from '@/internals/composite/composite';
import { ACTIVE_COMPOSITE_ITEM } from '@/internals/composite/constants';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import type { HTMLProps } from '@/internals/types';
import { getTarget } from '@/utils/shadowDom';
import type { CompositeGridNavigator } from './gridNavigation';
import type { Ref } from 'actview';

export interface UseCompositeRootParameters {
  orientation?: 'horizontal' | 'vertical' | 'both' | undefined;
  grid?: CompositeGridNavigator | undefined;
  loopFocus?: boolean | undefined;
  onLoop?:
    | ((
        event: any,
        prevIndex: number,
        nextIndex: number,
        elementsRef: Ref<Array<HTMLElement | null>>,
      ) => number)
    | undefined;
  highlightedIndex?: number | undefined;
  onHighlightedIndexChange?: ((index: number) => void) | undefined;
  direction: TextDirection;
  rootRef?: ((element: HTMLElement | null) => void) | undefined;
  /**
   * When `true`, pressing the Home key moves focus to the first item,
   * and pressing the End key moves focus to the last item.
   * @default false
   */
  enableHomeAndEndKeys?: boolean | undefined;
  /**
   * When `true`, keypress events on Composite's navigation keys
   * be stopped with event.stopPropagation().
   * @default false
   */
  stopEventPropagation?: boolean | undefined;
  /**
   * Array of item indices to be considered disabled.
   * Used for composite items that are focusable when disabled.
   */
  disabledIndices?: number[] | undefined;
  /**
   * Array of [modifier key values](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values#modifier_keys) that should allow normal keyboard actions
   * when pressed. By default, all modifier keys prevent normal actions.
   * @default []
   */
  modifierKeys?: ModifierKey[] | undefined;
}

export function useCompositeRoot(params: UseCompositeRootParameters) {
  const {
    loopFocus = true,
    orientation = 'both',
    grid,
    onLoop,
    direction,
    highlightedIndex: externalHighlightedIndex,
    onHighlightedIndexChange: externalSetHighlightedIndex,
    rootRef: externalRef,
    enableHomeAndEndKeys = false,
    stopEventPropagation,
    disabledIndices,
    modifierKeys = (EMPTY_ARRAY as unknown) as ModifierKey[],
  } = params;

  const internalHighlightedIndex = ref(0);
  const isGrid = grid != null;

  const rootRef = ref(null as HTMLElement | null);
  const mergedRef = useMergedRefs(
    (el: HTMLElement | null) => {
      rootRef.value = el;
    },
    externalRef,
  );

  const elementsRef = shallowRef([] as Array<HTMLElement | null>);
  const hasSetDefaultIndexRef = ref(false);
  const highlightedElementRef = ref(null as HTMLElement | null);

  // computed：internal 变化（键盘导航）时消费方（context/tabIndex）拿到实时值；
  // setup 求值的值快照会导致 roving tabindex 永不更新（浏览器键盘测试暴露）。
  const highlightedIndex = computed(() => externalHighlightedIndex ?? internalHighlightedIndex.value);

  const onHighlightedIndexChange = (index: number, shouldScrollIntoView = false) => {
    highlightedElementRef.value = elementsRef.value[index] ?? null;
    (externalSetHighlightedIndex ?? ((i: number) => (internalHighlightedIndex.value = i)))(index);
    if (shouldScrollIntoView) {
      const newActiveItem = elementsRef.value[index];
      scrollIntoViewIfNeeded(rootRef.value, newActiveItem, direction, orientation);
    }
  };

  const onMapChange = (map: Map<Element, CompositeMetadata<any>>) => {
    if (map.size === 0) {
      return;
    }

    if (hasSetDefaultIndexRef.value) {
      const elements = elementsRef.value;
      const nextIndex = elements.indexOf(highlightedElementRef.value);

      if (nextIndex === -1) {
        const replacement = elements[highlightedIndex.value];
        if (!replacement || isListIndexDisabled(elements, highlightedIndex.value, disabledIndices)) {
          onHighlightedIndexChange(getFallbackIndex(elements, disabledIndices));
        } else {
          highlightedElementRef.value = replacement;
        }
      } else if (nextIndex !== highlightedIndex.value) {
        onHighlightedIndexChange(nextIndex);
      }
      return;
    }

    hasSetDefaultIndexRef.value = true;

    const sortedElements = Array.from(map.keys()) as Array<HTMLElement | null>;
    const activeItem =
      sortedElements.find((compositeElement) =>
        compositeElement?.hasAttribute(ACTIVE_COMPOSITE_ITEM),
      ) ?? null;
    const activeIndex = activeItem ? (map.get(activeItem)?.index ?? -1) : -1;

    if (activeIndex !== -1) {
      onHighlightedIndexChange(activeIndex);
    } else if (isListIndexDisabled(sortedElements, highlightedIndex.value, disabledIndices)) {
      const firstEnabledIndex = findNonDisabledListIndex(sortedElements, {disabledIndices});
      if (!isIndexOutOfListBounds(sortedElements, firstEnabledIndex)) {
        onHighlightedIndexChange(firstEnabledIndex);
      }
    }

    scrollIntoViewIfNeeded(rootRef.value, activeItem, direction, orientation);
  };

  // React 版 useIsoLayoutEffect：disabledIndices 渲染后重验证默认 tab stop
  watch(
    () => [
      disabledIndices,
      externalHighlightedIndex,
      highlightedIndex.value,
      hasSetDefaultIndexRef.value,
    ] as const,
    () => {
      if (
        disabledIndices == null ||
        externalHighlightedIndex != null ||
        !hasSetDefaultIndexRef.value
      ) {
        return;
      }
      const elements = elementsRef.value;
      if (isListIndexDisabled(elements, highlightedIndex.value, disabledIndices)) {
        const firstEnabledIndex = findNonDisabledListIndex(elements, {disabledIndices});
        if (!isIndexOutOfListBounds(elements, firstEnabledIndex)) {
          onHighlightedIndexChange(firstEnabledIndex);
        }
      }
    },
    {flush: 'post'},
  );

  const wrappedOnLoop = (
    event: any,
    prevIndex: number,
    nextIndex: number,
  ) => {
    if (!onLoop) {
      return nextIndex;
    }
    return onLoop(event, prevIndex, nextIndex, elementsRef);
  };

  const onKeyDown = (event: any) => {
    const isHomeOrEnd = event.key === HOME || event.key === END;
    if (!COMPOSITE_KEYS.has(event.key) || (!enableHomeAndEndKeys && isHomeOrEnd)) {
      return;
    }

    if (isModifierKeySet(event, modifierKeys)) {
      return;
    }

    const element = rootRef.value;
    if (!element) {
      return;
    }

    const isRtl = direction === 'rtl';

    const horizontalForwardKey = isRtl ? ARROW_LEFT : ARROW_RIGHT;
    const horizontalBackwardKey = isRtl ? ARROW_RIGHT : ARROW_LEFT;
    const forwardKey = orientation === 'vertical' ? ARROW_DOWN : horizontalForwardKey;
    const backwardKey = orientation === 'vertical' ? ARROW_UP : horizontalBackwardKey;

    const target = getTarget(event);
    if (target != null && isNativeInput(target) && !isElementDisabled(target)) {
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      const textContent = target.value;
      // return to native textbox behavior when
      // 1 - Shift is held to make a text selection, or if there already is a text selection
      if (selectionStart == null || event.shiftKey || selectionStart !== selectionEnd) {
        return;
      }
      // 2 - arrow-ing forward and not in the last position of the text
      if (event.key !== backwardKey && selectionStart < textContent.length) {
        return;
      }
      // 3 -arrow-ing backward and not in the first position of the text
      if (event.key !== forwardKey && selectionStart > 0) {
        return;
      }
    }

    let nextIndex = highlightedIndex.value;
    const minIndex = getMinListIndex(elementsRef, disabledIndices);
    const maxIndex = getMaxListIndex(elementsRef, disabledIndices);

    if (grid != null) {
      nextIndex = grid({
        disabledIndices,
        elementsRef,
        event,
        highlightedIndex: highlightedIndex.value,
        loopFocus,
        maxIndex,
        minIndex,
        onLoop: wrappedOnLoop,
        orientation,
        rtl: isRtl,
      });
    }

    const isForwardKey =
      (orientation !== 'vertical' && event.key === horizontalForwardKey) ||
      (orientation !== 'horizontal' && event.key === ARROW_DOWN);
    const isBackwardKey =
      (orientation !== 'vertical' && event.key === horizontalBackwardKey) ||
      (orientation !== 'horizontal' && event.key === ARROW_UP);

    if (enableHomeAndEndKeys) {
      if (event.key === HOME) {
        nextIndex = minIndex;
      } else if (event.key === END) {
        nextIndex = maxIndex;
      }
    }

    if (nextIndex === highlightedIndex.value && (isForwardKey || isBackwardKey)) {
      if (loopFocus && nextIndex === maxIndex && isForwardKey) {
        nextIndex = minIndex;
        if (onLoop) {
          nextIndex = onLoop(event, highlightedIndex.value, nextIndex, elementsRef);
        }
      } else if (loopFocus && nextIndex === minIndex && isBackwardKey) {
        nextIndex = maxIndex;
        if (onLoop) {
          nextIndex = onLoop(event, highlightedIndex.value, nextIndex, elementsRef);
        }
      } else {
        nextIndex = findNonDisabledListIndex(elementsRef.value, {
          startingIndex: nextIndex,
          decrement: isBackwardKey,
          disabledIndices,
        });
      }
    }

    if (nextIndex !== highlightedIndex.value && !isIndexOutOfListBounds(elementsRef.value, nextIndex)) {
      if (stopEventPropagation) {
        event.stopPropagation();
      }

      if (isGrid || isHomeOrEnd || isForwardKey || isBackwardKey) {
        event.preventDefault();
      }
      onHighlightedIndexChange(nextIndex, true);

      // Wait for FocusManager `returnFocus` to execute.
      queueMicrotask(() => {
        elementsRef.value[nextIndex]?.focus();
      });
    }
  };

  const props: HTMLProps = {
    ref: mergedRef,
    onFocus(event: any) {
      const element = rootRef.value;
      const target = getTarget(event);
      if (!element || target == null || !isNativeInput(target)) {
        return;
      }
      target.setSelectionRange(0, target.value.length);
    },
    onKeyDown,
  };

  return {
    props,
    highlightedIndex,
    onHighlightedIndexChange,
    elementsRef,
    onMapChange,
    relayKeyboardEvent: onKeyDown,
  };
}

// Resolves the item that should hold the tab stop: the active item when it can take focus,
// otherwise the first item that can. Falls back to index 0 so an all-disabled composite keeps the
// index in range and regains a tab stop as soon as one of its items becomes focusable.
function getFallbackIndex(elements: Array<HTMLElement | null>, disabledIndices?: number[]) {
  let fallbackIndex = -1;

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];

    if (!element || isListIndexDisabled(elements, index, disabledIndices)) {
      continue;
    }

    if (element.hasAttribute(ACTIVE_COMPOSITE_ITEM)) {
      return index;
    }

    if (fallbackIndex === -1) {
      fallbackIndex = index;
    }
  }

  return Math.max(fallbackIndex, 0);
}

function isModifierKeySet(event: any, ignoredModifierKeys: ModifierKey[]) {
  for (const key of MODIFIER_KEYS) {
    if (ignoredModifierKeys.includes(key)) {
      continue;
    }
    if (event.getModifierState(key)) {
      return true;
    }
  }
  return false;
}
