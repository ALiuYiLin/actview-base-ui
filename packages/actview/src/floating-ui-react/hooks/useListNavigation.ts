import { computed, onMounted, watch } from 'actview';
import type { Ref } from 'actview';
import { useAnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import { ownerDocument } from '@/internals/owner';
import { useStableCallback } from '@/utils/useStableCallback';
import { useValueAsRef } from '@/utils/useValueAsRef';
import { platform } from '@/utils/platform';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import {
  findNonDisabledListIndex,
  getMaxListIndex,
  getMinListIndex,
  isIndexOutOfListBounds,
  type DisabledIndices,
} from '../utils/composite';
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP } from '../utils/constants';
import {
  activeElement,
  contains,
  getFloatingFocusElement,
  getTarget,
  isTypeableCombobox,
} from '../utils/element';
import { enqueueFocus } from '../utils/enqueueFocus';
import { isVirtualClick, isVirtualPointerEvent, stopEvent } from '../utils/event';

export const ESCAPE = 'Escape';

// WebKit fires zero-delta `mousemove`/`pointermove` events when the list scrolls
// beneath a stationary pointer, moving the highlight during keyboard navigation.
function isStationaryWebKitPointer(event: any) {
  return platform.engine.webkit && event.movementX === 0 && event.movementY === 0;
}

function doSwitch(
  orientation: UseListNavigationProps['orientation'],
  vertical: boolean,
  horizontal: boolean,
) {
  switch (orientation) {
    case 'vertical':
      return vertical;
    case 'horizontal':
      return horizontal;
    default:
      return vertical || horizontal;
  }
}

function isMainOrientationKey(key: string, orientation: UseListNavigationProps['orientation']) {
  const vertical = key === ARROW_UP || key === ARROW_DOWN;
  const horizontal = key === ARROW_LEFT || key === ARROW_RIGHT;
  return doSwitch(orientation, vertical, horizontal);
}

function isMainOrientationToEndKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
) {
  const vertical = key === ARROW_DOWN;
  const horizontal = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  return (
    doSwitch(orientation, vertical, horizontal) || key === 'Enter' || key === ' ' || key === ''
  );
}

function isCrossOrientationOpenKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
) {
  const vertical = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  const horizontal = key === ARROW_DOWN;
  return doSwitch(orientation, vertical, horizontal);
}

function isCrossOrientationCloseKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
  grid: boolean,
) {
  const vertical = rtl ? key === ARROW_RIGHT : key === ARROW_LEFT;
  const horizontal = key === ARROW_UP;
  if (orientation === 'both' || (orientation === 'horizontal' && grid)) {
    return key === ESCAPE;
  }
  return doSwitch(orientation, vertical, horizontal);
}

export interface UseListNavigationProps {
  /**
   * A ref that holds an array of list items.
   * @default empty list
   */
  listRef: {current: Array<HTMLElement | null>};
  /**
   * The index of the currently active (focused or highlighted) item, which may
   * or may not be selected.
   * @default null
   */
  activeIndex: number | null;
  /**
   * A callback that is called when the user navigates to a new active item.
   */
  onNavigate?:
    | ((activeIndex: number | null, event: any | undefined) => void)
    | undefined;
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The currently selected item index, which may or may not be active.
   * @default null
   */
  selectedIndex?: number | null | undefined;
  /**
   * Whether to focus the item upon opening the floating element.
   * @default 'auto'
   */
  focusItemOnOpen?: boolean | 'auto' | undefined;
  /**
   * Whether hovering an item synchronizes the focus.
   * @default true
   */
  focusItemOnHover?: boolean | undefined;
  /**
   * Whether pressing an arrow key on the navigation's main axis opens the
   * floating element.
   * @default true
   */
  openOnArrowKeyDown?: boolean | undefined;
  /**
   * Manually specify indices which should be disabled.
   */
  disabledIndices?: ReadonlyArray<number> | ((index: number) => boolean) | undefined;
  /**
   * Determines whether focus can escape the list.
   * `loopFocus` must be `true`.
   * @default false
   */
  allowEscape?: boolean | undefined;
  /**
   * Determines whether focus should loop around when navigating past the first
   * or last item.
   * @default false
   */
  loopFocus?: boolean | undefined;
  /**
   * If the list is nested within another one (e.g. a nested submenu), the
   * navigation semantics change.
   * @default false
   */
  nested?: boolean | undefined;
  /**
   * The orientation of the parent list, used to determine navigation direction.
   */
  parentOrientation?: UseListNavigationProps['orientation'] | undefined;
  /**
   * Whether the direction of the floating element's navigation is in RTL
   * layout.
   * @default false
   */
  rtl?: boolean | undefined;
  /**
   * Whether the focus is virtual (using `aria-activedescendant`).
   * @default false
   */
  virtual?: boolean | undefined;
  /**
   * The orientation in which navigation occurs.
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  /**
   * The id of the root component.
   */
  id?: string | undefined;
  /**
   * Whether to clear the active index when the pointer leaves an item.
   * @default true
   */
  resetOnPointerLeave?: boolean | undefined;
  /**
   * External FloatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Computes two-dimensional list navigation for grid-capable consumers.
   */
  grid?: any | null | undefined;
}

/**
 * Adds arrow key-based navigation of a list of items, either using real DOM
 * focus or virtual focus.
 * @see https://floating-ui.com/docs/useListNavigation
 * (actview 版：store 模式；open/floatingElement/domReferenceElement 读 .value。)
 */
export function useListNavigation(
  context: FloatingRootContext | FloatingContext,
  props: UseListNavigationProps,
): ElementProps {
  const {
    listRef,
    activeIndex,
    onNavigate: onNavigateProp = () => {},
    enabled = true,
    selectedIndex = null,
    allowEscape = false,
    loopFocus = false,
    nested = false,
    rtl = false,
    virtual = false,
    focusItemOnOpen = 'auto',
    focusItemOnHover = true,
    openOnArrowKeyDown = true,
    disabledIndices = undefined,
    orientation = 'vertical',
    parentOrientation,
    id,
    resetOnPointerLeave = true,
    externalTree,
    grid: navigateGrid,
  } = props;
  const isGrid = navigateGrid != null;

  if (process.env.NODE_ENV !== 'production') {
    if (allowEscape) {
      if (!loopFocus) {
        console.warn('`useListNavigation` looping must be enabled to allow escaping.');
      }

      if (!virtual) {
        console.warn('`useListNavigation` must be virtual to allow escaping.');
      }
    }

    if (orientation === 'vertical' && isGrid) {
      console.warn(
        'In grid list navigation mode, the `orientation` should',
        'be either "horizontal" or "both".',
      );
    }
  }

  const store = 'rootStore' in context ? context.rootStore : context;

  const open = store.useState('open');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');

  const dataRef = store.context.dataRef;

  const floatingFocusElement = computed(() => getFloatingFocusElement(floatingElement.value));
  const typeableComboboxReference = computed(() => isTypeableCombobox(domReferenceElement.value));
  const floatingFocusElementRef = useValueAsRef(floatingFocusElement);

  const parentId = useFloatingParentNodeId();
  const tree = useFloatingTree(externalTree);

  const focusItemOnOpenRef = {current: focusItemOnOpen};
  const indexRef = {current: selectedIndex ?? -1};
  const keyRef = {current: null as string | null};
  const isPointerModalityRef = {current: true};

  const onNavigate = useStableCallback((event?: any) => {
    onNavigateProp(indexRef.current === -1 ? null : indexRef.current, event);
  });

  const previousMountedRef = {current: !!floatingElement.value};
  const previousOpenRef = {current: open.value};
  const forceSyncFocusRef = {current: false};
  const forceScrollIntoViewRef = {current: false};
  const cancelQueuedFocusRef = {current: null as (() => void) | null};

  const disabledIndicesRef = useValueAsRef<DisabledIndices | undefined>(
    disabledIndices as DisabledIndices | undefined,
  ) as unknown as {current: DisabledIndices | undefined};
  const latestOpenRef = useValueAsRef(open);
  const selectedIndexRef = useValueAsRef(selectedIndex);
  const resetOnPointerLeaveRef = useValueAsRef(resetOnPointerLeave);

  const focusFrame = useAnimationFrame();
  const waitForListPopulatedFrame = useAnimationFrame();

  const focusItem = useStableCallback(() => {
    function runFocus(item: HTMLElement) {
      if (virtual) {
        tree?.events.emit('virtualfocus', item);
      } else {
        cancelQueuedFocusRef.current = enqueueFocus(item, {
          sync: forceSyncFocusRef.current,
          preventScroll: true,
        });
      }
    }

    const initialItem = listRef.current[indexRef.current];
    const forceScrollIntoView = forceScrollIntoViewRef.current;

    if (initialItem) {
      runFocus(initialItem);
    }

    const scheduler = forceSyncFocusRef.current
      ? (callback: () => void) => callback()
      : (callback: () => void) => focusFrame.request(callback);

    scheduler(() => {
      const waitedItem = listRef.current[indexRef.current] || initialItem;

      if (!waitedItem) {
        return;
      }

      if (!initialItem) {
        runFocus(waitedItem);
      }

      const shouldScrollIntoView =
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        item && (forceScrollIntoView || !isPointerModalityRef.current);

      if (shouldScrollIntoView) {
        // JSDOM doesn't support `.scrollIntoView()` but it's widely supported
        // by all browsers.
        waitedItem.scrollIntoView?.({block: 'nearest', inline: 'nearest'});
      }
    });
  });

  watch(
    () => orientation,
    () => {
      dataRef.current.orientation = orientation;
    },
    {flush: 'post', immediate: true},
  );

  // Sync `selectedIndex` to be the `activeIndex` upon opening the floating
  // element. Also, reset `activeIndex` upon closing the floating element.
  watch(
    () => [enabled, open.value, floatingElement.value, selectedIndex] as const,
    () => {
      if (!enabled) {
        return;
      }

      if (open.value && floatingElement.value) {
        indexRef.current = selectedIndex ?? -1;
        if (focusItemOnOpenRef.current && selectedIndex != null) {
          // Regardless of the pointer modality, we want to ensure the selected
          // item comes into view when the floating element is opened.
          forceScrollIntoViewRef.current = true;
          onNavigate();
        }
      } else if (previousMountedRef.current) {
        // Reset the active index when the list is no longer open and mounted (closing or
        // unmounting).
        indexRef.current = -1;
        onNavigate();
      }
    },
    {flush: 'post', immediate: true},
  );

  // Sync `activeIndex` to be the focused item while the floating element is
  // open.
  watch(
    () => [
      enabled,
      open.value,
      floatingElement.value,
      activeIndex,
      nested,
      orientation,
      rtl,
    ] as const,
    () => {
      if (!enabled) {
        return;
      }
      if (!open.value) {
        forceSyncFocusRef.current = false;
        return;
      }
      if (!floatingElement.value) {
        return;
      }

      if (activeIndex == null) {
        forceSyncFocusRef.current = false;

        if (selectedIndexRef.current != null) {
          return;
        }

        // Reset while the floating element was open (e.g. the list changed).
        if (previousMountedRef.current) {
          indexRef.current = -1;
          focusItem();
        }

        // Initial sync.
        if (
          (!previousOpenRef.current || !previousMountedRef.current) &&
          focusItemOnOpenRef.current &&
          (keyRef.current != null || (focusItemOnOpenRef.current === true && keyRef.current == null))
        ) {
          let runs = 0;
          const waitForListPopulated = () => {
            if (listRef.current[0] == null) {
              // Avoid letting the browser paint if possible on the first try,
              // otherwise use rAF. Don't try more than twice, since something
              // is wrong otherwise.
              if (runs < 2) {
                const scheduler = runs
                  ? (callback: () => void) => waitForListPopulatedFrame.request(callback)
                  : queueMicrotask;
                scheduler(waitForListPopulated);
              }
              runs += 1;
            } else {
              // Initially focus the first non-disabled item.
              indexRef.current =
                keyRef.current == null ||
                isMainOrientationToEndKey(keyRef.current, orientation, rtl) ||
                nested
                  ? getMinListIndex(listRef)
                  : getMaxListIndex(listRef);
              keyRef.current = null;
              onNavigate();
            }
          };

          waitForListPopulated();
        }
      } else if (!isIndexOutOfListBounds(listRef.current, activeIndex)) {
        indexRef.current = activeIndex;
        focusItem();
        forceScrollIntoViewRef.current = false;
      }
    },
    {flush: 'post', immediate: true},
  );

  // Ensure the parent floating element has focus when a nested child closes.
  watch(
    () => [enabled, floatingElement.value, domReferenceElement.value, tree, parentId, virtual] as const,
    () => {
      if (!enabled || floatingElement.value || !tree || virtual || !previousMountedRef.current) {
        return;
      }

      const nodes = tree.nodesRef.current;
      const parent = nodes.find((node) => node.id === parentId)?.context?.elements.floating;
      const activeEl = activeElement(ownerDocument(domReferenceElement.value ?? parent ?? null));
      const treeContainsActiveEl = nodes.some(
        (node) => node.context && contains(node.context.elements.floating, activeEl),
      );

      if (parent && !treeContainsActiveEl && isPointerModalityRef.current) {
        parent.focus({preventScroll: true});
      }
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [open.value, floatingElement.value] as const,
    () => {
      previousOpenRef.current = open.value;
      previousMountedRef.current = !!floatingElement.value;
    },
    {flush: 'post'},
  );

  watch(
    () => [open.value, focusItemOnOpen] as const,
    () => {
      if (!open.value) {
        keyRef.current = null;
        focusItemOnOpenRef.current = focusItemOnOpen;
      }
    },
    {flush: 'post', immediate: true},
  );

  const hasActiveIndex = activeIndex != null;

  const syncCurrentTarget = useStableCallback((event: any) => {
    if (!latestOpenRef.current) {
      return;
    }

    const index = listRef.current.indexOf(event.currentTarget);
    if (index !== -1 && (indexRef.current !== index || activeIndex !== index)) {
      indexRef.current = index;
      onNavigate(event);
    }
  });

  const getParentOrientation = useStableCallback(() => {
    return (
      parentOrientation ??
      (tree?.nodesRef.current.find((node) => node.id === parentId)?.context?.dataRef?.current
        .orientation as UseListNavigationProps['orientation'])
    );
  });

  const getMinEnabledIndex = useStableCallback(() => {
    return getMinListIndex(listRef, disabledIndicesRef.current);
  });

  const commonOnKeyDown = useStableCallback((event: any) => {
    isPointerModalityRef.current = false;
    forceSyncFocusRef.current = true;

    // When composing a character, Chrome fires ArrowDown twice.
    if (event.which === 229) {
      return;
    }

    // If the floating element is animating out, ignore navigation.
    if (!latestOpenRef.current && event.currentTarget === floatingFocusElementRef.current) {
      return;
    }

    if (nested && isCrossOrientationCloseKey(event.key, orientation, rtl, isGrid)) {
      // If the nested list's close key is also the parent navigation key,
      // let the parent navigate. Otherwise, stop propagating the event.
      if (!isMainOrientationKey(event.key, getParentOrientation())) {
        stopEvent(event);
      }

      store.setOpen(false, createChangeEventDetails(REASONS.listNavigation, event));

      if (isHTMLElement(domReferenceElement.value)) {
        if (virtual) {
          tree?.events.emit('virtualfocus', domReferenceElement.value);
        } else {
          domReferenceElement.value.focus();
        }
      }

      return;
    }

    const currentIndex = indexRef.current;
    const minIndex = getMinListIndex(listRef, disabledIndices);
    const maxIndex = getMaxListIndex(listRef, disabledIndices);

    if (!typeableComboboxReference.value) {
      if (event.key === 'Home') {
        stopEvent(event);
        indexRef.current = minIndex;
        onNavigate(event);
      }

      if (event.key === 'End') {
        stopEvent(event);
        indexRef.current = maxIndex;
        onNavigate(event);
      }
    }

    // Grid navigation is injected by grid-capable consumers.
    if (navigateGrid != null) {
      const index = navigateGrid(
        event,
        indexRef.current,
        listRef,
        orientation,
        loopFocus,
        rtl,
        disabledIndices,
        minIndex,
        maxIndex,
      );

      if (index != null) {
        indexRef.current = index;
        onNavigate(event);
      }

      if (orientation === 'both') {
        return;
      }
    }

    if (isMainOrientationKey(event.key, orientation)) {
      stopEvent(event);

      // Reset the index if no item is focused.
      if (
        open.value &&
        !virtual &&
        activeElement(event.currentTarget.ownerDocument) === event.currentTarget
      ) {
        indexRef.current = isMainOrientationToEndKey(event.key, orientation, rtl)
          ? minIndex
          : maxIndex;
        onNavigate(event);
        return;
      }

      if (isMainOrientationToEndKey(event.key, orientation, rtl)) {
        if (loopFocus) {
          if (currentIndex >= maxIndex) {
            if (allowEscape && currentIndex !== listRef.current.length) {
              indexRef.current = -1;
            } else {
              // Give time for virtualizers to update the listRef.
              forceSyncFocusRef.current = false;
              indexRef.current = minIndex;
            }
          } else {
            indexRef.current = findNonDisabledListIndex(listRef.current, {
              startingIndex: currentIndex,
              disabledIndices,
            });
          }
        } else {
          indexRef.current = Math.min(
            maxIndex,
            findNonDisabledListIndex(listRef.current, {
              startingIndex: currentIndex,
              disabledIndices,
            }),
          );
        }
      } else if (loopFocus) {
        if (currentIndex <= minIndex) {
          if (allowEscape && currentIndex !== -1) {
            indexRef.current = listRef.current.length;
          } else {
            // Give time for virtualizers to update the listRef.
            forceSyncFocusRef.current = false;
            indexRef.current = maxIndex;
          }
        } else {
          indexRef.current = findNonDisabledListIndex(listRef.current, {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices,
          });
        }
      } else {
        indexRef.current = Math.max(
          minIndex,
          findNonDisabledListIndex(listRef.current, {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices,
          }),
        );
      }

      if (isIndexOutOfListBounds(listRef.current, indexRef.current)) {
        indexRef.current = -1;
      }

      onNavigate(event);
    }
  });

  const item: ElementProps['item'] = {
    onFocus(event: any) {
      forceSyncFocusRef.current = true;
      syncCurrentTarget(event);
    },
    onClick: ({currentTarget}: any) => currentTarget.focus({preventScroll: true}), // Safari
    onMouseMove(event: any) {
      if (isStationaryWebKitPointer(event)) {
        return;
      }
      forceSyncFocusRef.current = true;
      forceScrollIntoViewRef.current = false;
      if (focusItemOnHover) {
        syncCurrentTarget(event);
      }
    },
    onPointerLeave(event: any) {
      if (
        !latestOpenRef.current ||
        !isPointerModalityRef.current ||
        event.pointerType === 'touch'
      ) {
        return;
      }

      forceSyncFocusRef.current = true;

      const relatedTarget = event.relatedTarget as HTMLElement | null;

      if (!focusItemOnHover || listRef.current.includes(relatedTarget)) {
        return;
      }

      if (!resetOnPointerLeaveRef.current) {
        return;
      }

      cancelQueuedFocusRef.current?.();
      cancelQueuedFocusRef.current = null;

      indexRef.current = -1;
      onNavigate(event);

      if (!virtual) {
        const floatingFocusEl = floatingFocusElementRef.current;
        const activeEl = activeElement(ownerDocument(floatingFocusEl));
        if (floatingFocusEl && contains(floatingFocusEl, activeEl)) {
          floatingFocusEl.focus({preventScroll: true});
        }
      }
    },
  };

  const ariaActiveDescendantProp =
    virtual &&
    open.value &&
    hasActiveIndex && {
      'aria-activedescendant': `${id}-${activeIndex}`,
    };

  const floating: ElementProps['floating'] = {
    'aria-orientation': orientation === 'both' ? undefined : orientation,
    ...(!typeableComboboxReference.value ? ariaActiveDescendantProp : {}),
    onKeyDown(event: any) {
      // Close submenu on Shift+Tab
      if (event.key === 'Tab' && event.shiftKey && open.value && !virtual) {
        // If the event originated from within a nested element (e.g., a Dialog opened from
        // within the menu), don't close the menu.
        const target = getTarget(event) as Element | null;
        if (target && !contains(floatingFocusElementRef.current, target)) {
          return;
        }

        stopEvent(event);
        store.setOpen(false, createChangeEventDetails(REASONS.focusOut, event));

        if (isHTMLElement(domReferenceElement.value)) {
          domReferenceElement.value.focus();
        }

        return;
      }

      commonOnKeyDown(event);
    },
    onPointerMove(event: any) {
      if (isStationaryWebKitPointer(event)) {
        return;
      }
      isPointerModalityRef.current = true;
    },
  };

  const trigger: ElementProps['trigger'] = {
    onKeyDown(event: any) {
      // non-reactive open state (to prevent re-creation of the handler)
      const currentOpen = store.select('open');
      isPointerModalityRef.current = false;

      const isArrowKey = event.key.startsWith('Arrow');
      const isParentCrossOpenKey = isCrossOrientationOpenKey(
        event.key,
        getParentOrientation(),
        rtl,
      );
      const isMainKey = isMainOrientationKey(event.key, orientation);
      const isNavigationKey =
        (nested ? isParentCrossOpenKey : isMainKey) ||
        event.key === 'Enter' ||
        event.key.trim() === '';

      if (virtual && currentOpen) {
        return commonOnKeyDown(event);
      }

      // If a floating element should not open on arrow key down, avoid
      // setting `activeIndex` while it's closed.
      if (!currentOpen && !openOnArrowKeyDown && isArrowKey) {
        return undefined;
      }

      if (isNavigationKey) {
        const isParentMainKey = isMainOrientationKey(event.key, getParentOrientation());
        keyRef.current = nested && isParentMainKey ? null : event.key;
      }

      if (nested) {
        if (isParentCrossOpenKey) {
          stopEvent(event);

          if (currentOpen) {
            indexRef.current = getMinEnabledIndex();
            onNavigate(event);
          } else {
            openOnNavigationKeyDown(event);
          }
        }

        return undefined;
      }

      if (isMainKey) {
        if (selectedIndexRef.current != null) {
          indexRef.current = selectedIndexRef.current;
        }

        stopEvent(event);

        if (!currentOpen && openOnArrowKeyDown) {
          openOnNavigationKeyDown(event);
        } else {
          commonOnKeyDown(event);
        }

        if (currentOpen) {
          onNavigate(event);
        }
      }

      return undefined;
    },
    onFocus(event: any) {
      if (store.select('open') && !virtual) {
        indexRef.current = -1;
        onNavigate(event);
      }
    },
    onPointerDown: checkVirtualPointer,
    onPointerEnter: checkVirtualPointer,
    onMouseDown: checkVirtualMouse,
    onClick: checkVirtualMouse,
  };

  function openOnNavigationKeyDown(event: any) {
    store.setOpen(
      true,
      createChangeEventDetails(
        REASONS.listNavigation,
        event,
        event.currentTarget as HTMLElement,
      ),
    );
  }

  function checkVirtualMouse(event: any) {
    if (focusItemOnOpen === 'auto' && isVirtualClick(event)) {
      focusItemOnOpenRef.current = !virtual;
    }
  }

  function checkVirtualPointer(event: any) {
    // `pointerdown` fires first, reset the state then perform the checks.
    focusItemOnOpenRef.current = focusItemOnOpen;
    if (focusItemOnOpen === 'auto' && isVirtualPointerEvent(event)) {
      focusItemOnOpenRef.current = true;
    }
  }

  const reference: ElementProps['reference'] = {
    ...ariaActiveDescendantProp,
    ...trigger,
  };

  return enabled ? {reference, floating, item, trigger} : {};
}
