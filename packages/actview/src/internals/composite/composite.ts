export const ARROW_UP = 'ArrowUp';
export const ARROW_DOWN = 'ArrowDown';
export const ARROW_LEFT = 'ArrowLeft';
export const ARROW_RIGHT = 'ArrowRight';
export const HOME = 'Home';
export const END = 'End';
export const PAGE_UP = 'PageUp';
export const PAGE_DOWN = 'PageDown';

export const COMPOSITE_KEYS = new Set([ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, HOME, END]);

export const SHIFT = 'Shift' as const;
export const MODIFIER_KEYS = [SHIFT, 'Control', 'Alt', 'Meta'] as const;
export type ModifierKey = (typeof MODIFIER_KEYS)[number];

export type DisabledIndices = ReadonlyArray<number> | ((index: number) => boolean);

function isInputElement(element: EventTarget): element is HTMLInputElement {
  return element instanceof HTMLElement && element.tagName === 'INPUT';
}

export function isNativeInput(
  element: EventTarget,
): element is HTMLElement & (HTMLInputElement | HTMLTextAreaElement) {
  if (isInputElement(element) && element.selectionStart != null) {
    return true;
  }
  if (element instanceof HTMLElement && element.tagName === 'TEXTAREA') {
    return true;
  }
  return false;
}

export function isIndexOutOfListBounds(list: Array<HTMLElement | null>, index: number) {
  return index < 0 || index >= list.length;
}

export function getMinListIndex(
  listRef: {current: ReadonlyArray<HTMLElement | null>},
  disabledIndices?: DisabledIndices | undefined,
) {
  return findNonDisabledListIndex(listRef.current, {disabledIndices});
}

export function getMaxListIndex(
  listRef: {current: Array<HTMLElement | null>},
  disabledIndices?: DisabledIndices | undefined,
) {
  return findNonDisabledListIndex(listRef.current, {
    decrement: true,
    startingIndex: listRef.current.length,
    disabledIndices,
  });
}

export function findNonDisabledListIndex(
  list: ReadonlyArray<HTMLElement | null>,
  {
    startingIndex = -1,
    decrement = false,
    disabledIndices,
    amount = 1,
  }: {
    startingIndex?: number | undefined;
    decrement?: boolean | undefined;
    disabledIndices?: DisabledIndices | undefined;
    amount?: number | undefined;
  } = {},
): number {
  let index = startingIndex;
  do {
    index += decrement ? -amount : amount;
  } while (
    index >= 0 &&
    index <= list.length - 1 &&
    isListIndexDisabled(list, index, disabledIndices)
  );

  return index;
}

export function isListIndexDisabled(
  list: ReadonlyArray<HTMLElement | null>,
  index: number,
  disabledIndices?: DisabledIndices,
) {
  const isExplicitlyDisabled =
    typeof disabledIndices === 'function'
      ? disabledIndices(index)
      : (disabledIndices?.includes(index) ?? false);

  if (isExplicitlyDisabled) {
    return true;
  }

  const element = list[index];
  if (!element) {
    return false;
  }

  if (!isElementVisible(element)) {
    return true;
  }

  // A natively disabled element can never receive focus, so it must always be
  // skipped, even when `disabledIndices` marks it as enabled. Only
  // `aria-disabled` items can be focusable-while-disabled.
  if (element.matches(':disabled')) {
    return true;
  }

  return (
    !disabledIndices &&
    (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true')
  );
}

function isElementVisible(element: Element | null) {
  if (!element || !element.isConnected) {
    return false;
  }

  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility();
  }

  return true;
}

export function scrollIntoViewIfNeeded(
  scrollContainer: HTMLElement | null,
  element: HTMLElement | null,
  direction: 'ltr' | 'rtl',
  orientation: 'horizontal' | 'vertical' | 'both',
) {
  if (!scrollContainer || !element || !element.scrollTo) {
    return;
  }

  let targetX = scrollContainer.scrollLeft;
  let targetY = scrollContainer.scrollTop;

  const isOverflowingX = scrollContainer.clientWidth < scrollContainer.scrollWidth;
  const isOverflowingY = scrollContainer.clientHeight < scrollContainer.scrollHeight;

  if (isOverflowingX && orientation !== 'vertical') {
    const elementOffsetLeft = getOffset(scrollContainer, element, 'left');
    const containerStyles = getComputedStyle(scrollContainer);
    const elementStyles = getComputedStyle(element);

    const scrollMarginRight = parseFloat(elementStyles.scrollMarginRight) || 0;
    const scrollPaddingRight = parseFloat(containerStyles.scrollPaddingRight) || 0;

    if (direction === 'ltr') {
      if (
        elementOffsetLeft + element.offsetWidth + scrollMarginRight >
        scrollContainer.scrollLeft + scrollContainer.clientWidth - scrollPaddingRight
      ) {
        // overflow to the right, scroll to align right edges
        targetX =
          elementOffsetLeft +
          element.offsetWidth +
          scrollMarginRight -
          scrollContainer.clientWidth +
          scrollPaddingRight;
      } else if (elementOffsetLeft < scrollContainer.scrollLeft) {
        // overflow to the left, scroll to align left edges
        targetX = elementOffsetLeft;
      }
    } else {
      const scrollMarginLeft = parseFloat(elementStyles.scrollMarginLeft) || 0;
      const scrollPaddingLeft = parseFloat(containerStyles.scrollPaddingLeft) || 0;

      if (
        elementOffsetLeft <
        scrollContainer.scrollLeft +
          scrollContainer.clientWidth -
          scrollPaddingLeft -
          scrollMarginLeft
      ) {
        // overflow to the right, scroll to align right edges
        targetX =
          elementOffsetLeft -
          scrollContainer.clientWidth +
          scrollPaddingLeft +
          scrollMarginLeft;
      } else if (
        elementOffsetLeft + element.offsetWidth + scrollMarginLeft >
        scrollContainer.scrollLeft
      ) {
        // overflow to the left, scroll to align left edges
        targetX = elementOffsetLeft + element.offsetWidth + scrollMarginLeft;
      }
    }
  }

  if (isOverflowingY && orientation !== 'horizontal') {
    const elementOffsetTop = getOffset(scrollContainer, element, 'top');
    const containerStyles = getComputedStyle(scrollContainer);
    const elementStyles = getComputedStyle(element);

    const scrollMarginBottom = parseFloat(elementStyles.scrollMarginBottom) || 0;
    const scrollPaddingBottom = parseFloat(containerStyles.scrollPaddingBottom) || 0;
    const scrollMarginTop = parseFloat(elementStyles.scrollMarginTop) || 0;
    const scrollPaddingTop = parseFloat(containerStyles.scrollPaddingTop) || 0;

    if (
      elementOffsetTop + element.offsetHeight + scrollMarginBottom >
      scrollContainer.scrollTop + scrollContainer.clientHeight - scrollPaddingBottom
    ) {
      // overflow to the bottom, scroll to align bottom edges
      targetY =
        elementOffsetTop +
        element.offsetHeight +
        scrollMarginBottom -
        scrollContainer.clientHeight +
        scrollPaddingBottom;
    } else if (elementOffsetTop - scrollMarginTop < scrollContainer.scrollTop + scrollPaddingTop) {
      // overflow to the top, scroll to align top edges
      targetY = elementOffsetTop - scrollMarginTop - scrollPaddingTop;
    }
  }

  if (targetX !== scrollContainer.scrollLeft || targetY !== scrollContainer.scrollTop) {
    element.scrollIntoView?.();
  }
}

function getOffset(
  scrollContainer: HTMLElement,
  element: HTMLElement,
  type: 'left' | 'top',
): number {
  let elementOffset = 0;
  if (element.offsetParent === scrollContainer) {
    elementOffset = type === 'left' ? element.offsetLeft : element.offsetTop;
  } else {
    const rect = element.getBoundingClientRect();
    const scrollRect = scrollContainer.getBoundingClientRect();
    elementOffset = type === 'left' ? rect.left - scrollRect.left : rect.top - scrollRect.top;
  }

  return elementOffset;
}
