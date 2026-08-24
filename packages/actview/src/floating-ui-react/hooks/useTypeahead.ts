import {watch, ref} from 'actview';
import type { Ref } from 'actview';
import { useStableCallback } from '@/utils/useStableCallback';
import { useTimeout } from '@/utils/useTimeout';
import { EMPTY_ARRAY } from '@/utils/empty';
import { isElementVisible, isListIndexDisabled, type DisabledIndices } from '../utils/composite';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { contains } from '../utils/element';
import { stopEvent } from '../utils/event';

export interface UseTypeaheadProps {
  /**
   * A ref which contains an array of strings whose indices match the HTML
   * elements of the list.
   * @default empty list
   */
  listRef: Ref<Array<string | null>>;
  /**
   * The index of the active (focused or highlighted) item in the list.
   * @default null
   */
  activeIndex: number | null;
  /**
   * Callback invoked with the matching index if found as the user types.
   */
  onMatch?: ((index: number) => void) | undefined;
  /**
   * Optional list of item elements that correspond to `listRef` indices.
   */
  elementsRef?: Ref<Array<HTMLElement | null>> | undefined;
  /**
   * Indices that are disabled, either as an array or a predicate.
   */
  disabledIndices?: DisabledIndices | undefined;
  /**
   * Callback invoked with the current typing activity as the user types.
   */
  onTyping?: ((isTyping: boolean) => void) | undefined;
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The number of milliseconds to wait before resetting the typed string.
   * @default 750
   */
  resetMs?: number | undefined;
  /**
   * The index of the selected item in the list, if available.
   * @default null
   */
  selectedIndex?: number | null | undefined;
}

/**
 * Provides a matching callback that can be used to focus an item as the user
 * types, often used in tandem with `useListNavigation()`.
 * @see https://floating-ui.com/docs/useTypeahead
 * (actview 版：store 模式；open 为 ComputedRef 读 .value。)
 */
export function useTypeahead(
  context: FloatingRootContext | FloatingContext,
  props: UseTypeaheadProps,
): ElementProps {
  const {
    listRef,
    elementsRef,
    activeIndex,
    onMatch: onMatchProp,
    disabledIndices,
    onTyping,
    enabled = true,
    resetMs = 750,
    selectedIndex = null,
  } = props;

  const store = 'rootStore' in context ? context.rootStore : context;

  const open = store.useState('open');

  const timeout = useTimeout();
  const stringRef = ref('');
  const prevIndexRef = ref(selectedIndex ?? activeIndex ?? -1) as Ref<number | null>;
  const matchIndexRef = ref(null as number | null);

  const onKeyDown = useStableCallback((event: any) => {
    function getElement(index: number) {
      return elementsRef?.value[index];
    }

    function isItemAvailable(index: number) {
      const element = getElement(index);
      if ((element && !isElementVisible(element)) || element?.matches(':disabled')) {
        return false;
      }
      return disabledIndices == null || !isListIndexDisabled(EMPTY_ARRAY, index, disabledIndices);
    }

    function getMatchingIndex(list: Array<string | null>, string: string, startIndex = 0) {
      if (list.length === 0) {
        return -1;
      }

      const normalizedStartIndex = ((startIndex % list.length) + list.length) % list.length;
      const lowerString = string.toLowerCase();

      for (let offset = 0; offset < list.length; offset += 1) {
        const index = (normalizedStartIndex + offset) % list.length;
        const text = list[index];
        if (!text?.toLowerCase().startsWith(lowerString) || !isItemAvailable(index)) {
          continue;
        }
        return index;
      }
      return -1;
    }

    const listContent = listRef.value;

    if (stringRef.value.length > 0 && event.key === ' ') {
      // Space should continue the in-progress typeahead session.
      stopEvent(event);
      onTyping?.(true);
    }

    if (stringRef.value.length > 0 && stringRef.value[0] !== ' ') {
      if (getMatchingIndex(listContent, stringRef.value) === -1 && event.key !== ' ') {
        onTyping?.(false);
      }
    }

    if (
      listContent == null ||
      // Character key.
      event.key.length !== 1 ||
      // Modifier key.
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    if (open.value && event.key !== ' ') {
      stopEvent(event);
      onTyping?.(true);
    }

    // Capture whether this is a new typing session before mutating the string.
    const isNewSession = stringRef.value === '';
    if (isNewSession) {
      prevIndexRef.value = selectedIndex ?? activeIndex ?? -1;
    }

    // Bail out if the list contains a word like "llama" or "aaron". TODO:
    // allow it in this case, too.
    const allowRapidSuccessionOfFirstLetter = listContent.every((text, index) =>
      text && isItemAvailable(index) ? text[0]?.toLowerCase() !== text[1]?.toLowerCase() : true,
    );

    // Allows the user to cycle through items that start with the same letter
    // in rapid succession.
    if (allowRapidSuccessionOfFirstLetter && stringRef.value === event.key) {
      stringRef.value = '';
      prevIndexRef.value = matchIndexRef.value;
    }

    stringRef.value += event.key;
    timeout.start(resetMs, () => {
      stringRef.value = '';
      prevIndexRef.value = matchIndexRef.value;
      onTyping?.(false);
    });

    // Compute the starting index for this search.
    const prevIndex = isNewSession ? (selectedIndex ?? activeIndex ?? -1) : prevIndexRef.value;
    const startIndex = (prevIndex ?? 0) + 1;

    const index = getMatchingIndex(listContent, stringRef.value, startIndex);

    if (index !== -1) {
      onMatchProp?.(index);
      matchIndexRef.value = index;
    } else if (event.key !== ' ') {
      stringRef.value = '';
      onTyping?.(false);
    }
  });

  const onBlur = useStableCallback((event: any) => {
    const next = event.relatedTarget as Element | null;
    const currentDomReferenceElement = store.select('domReferenceElement');
    const currentFloatingElement = store.select('floatingElement');
    const withinComposite =
      contains(currentDomReferenceElement, next) || contains(currentFloatingElement, next);

    // Keep the session if focus moves within the composite (reference <-> floating).
    if (withinComposite) {
      return;
    }

    // End the current typing session when focus leaves the composite entirely.
    timeout.clear();
    stringRef.value = '';
    prevIndexRef.value = matchIndexRef.value;
    onTyping?.(false);
  });

  watch(
    () => [open.value, selectedIndex] as const,
    () => {
      if (!open.value && selectedIndex !== null) {
        return;
      }

      timeout.clear();
      matchIndexRef.value = null;

      if (stringRef.value !== '') {
        stringRef.value = '';
      }
    },
    {flush: 'post', immediate: true},
  );

  const sharedProps = {onKeyDown, onBlur};

  return enabled ? {reference: sharedProps, floating: sharedProps} : {};
}
