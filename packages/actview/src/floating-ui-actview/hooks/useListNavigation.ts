import { computed, watch } from 'actview';
import { useAnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { platform } from '@base-ui/actview-utils/platform';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import {
  findNonDisabledListIndex,
  getMaxListIndex,
  getMinListIndex,
  isIndexOutOfListBounds,
} from '../utils/composite';
import type { gridNavigation } from './gridNavigation';
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
// https://github.com/mui/base-ui/issues/4002
function isStationaryWebKitPointer(event: MouseEvent | PointerEvent) {
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
  listRef: { current: Array<HTMLElement | null> };
  /**
   * The index of the currently active (focused or highlighted) item, which may
   * or may not be selected.
   * @default null
   */
  activeIndex: number | null;
  /**
   * A callback that is called when the user navigates to a new active item,
   * passed in a new `activeIndex`.
   */
  onNavigate?: ((activeIndex: number | null, event: Event | undefined) => void) | undefined;
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
   * Whether to focus the item upon opening the floating element. 'auto' infers
   * what to do based on the input type (keyboard vs. pointer), while a boolean
   * value will force the value.
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
   * By default elements with either a `disabled` or `aria-disabled` attribute
   * are skipped in the list navigation — however, this requires the items to
   * be rendered.
   * This prop allows you to manually specify indices which should be disabled,
   * overriding the default logic.
   * @default undefined
   */
  disabledIndices?: ReadonlyArray<number> | ((index: number) => boolean) | undefined;
  /**
   * Determines whether focus can escape the list, such that nothing is selected
   * after navigating beyond the boundary of the list. In some
   * autocomplete/combobox components, this may be desired, as screen
   * readers will return to the input.
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
   * Allows to specify the orientation of the parent list, which is used to
   * determine the direction of the navigation.
   * This is useful when list navigation is used within a Composite,
   * as the hook can't determine the orientation of the parent list automatically.
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
   * Use this if you need focus to remain on the reference element
   * (such as an input), but allow arrow keys to navigate list items.
   * This is common in autocomplete listbox components.
   * Your virtually-focused list items must have a unique `id` set on them.
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
  grid?: typeof gridNavigation | null | undefined;
}

/**
 * Adds arrow key-based navigation of a list of items, either using real DOM
 * focus or virtual focus.
 * @see https://floating-ui.com/docs/useListNavigation
 */
export function useListNavigation(
  context: FloatingRootContext | FloatingContext,
  props: UseListNavigationProps,
): ElementProps {
  const {
    listRef,
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

  const activeIndexRef = useValueAsRef(props.activeIndex);
  const selectedIndexRef = useValueAsRef(props.selectedIndex ?? null);

  const floatingFocusElement = computed(() => getFloatingFocusElement(floatingElement.value));
  const typeableComboboxReference = computed(() =>
    isTypeableCombobox(domReferenceElement.value),
  );
  const floatingFocusElementRef = useValueAsRef(floatingFocusElement);

  const parentId = useFloatingParentNodeId();
  const tree = useFloatingTree(externalTree);

  const focusItemOnOpenRef = { current: focusItemOnOpen };
  const indexRef = { current: (selectedIndexRef.current ?? -1) as number };
  const keyRef = { current: null as null | string };
  const isPointerModalityRef = { current: true };

  const onNavigate = (event?: Event) => {
    onNavigateProp(indexRef.current === -1 ? null : indexRef.current, event);
  };

  const previousMountedRef = { current: !!floatingElement.value };
  const previousOpenRef = { current: open.value };
  const forceSyncFocusRef = { current: false };
  const forceScrollIntoViewRef = { current: false };
  const cancelQueuedFocusRef = { current: null as null | (() => void) };

  const disabledIndicesRef = useValueAsRef(disabledIndices);
  const latestOpenRef = useValueAsRef(open);
  const resetOnPointerLeaveRef = useValueAsRef(resetOnPointerLeave);

  const focusFrame = useAnimationFrame();
  const waitForListPopulatedFrame = useAnimationFrame();

  const focusItem = () => {
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
        waitedItem.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }
    });
  };

  dataRef.current.orientation = orientation;

  // Sync `selectedIndex` to be the `activeIndex` upon opening the floating
  // element. Also, reset `activeIndex` upon closing the floating element.
  watch(
    [open, floatingElement, () => selectedIndexRef.current],
    ([openValue, floatingValue, selectedIndexValue]) => {
      if (!enabled) {
        return;
      }

      if (openValue && floatingValue) {
        indexRef.current = selectedIndexValue ?? -1;
        if (focusItemOnOpenRef.current && selectedIndexValue != null) {
          // Regardless of the pointer modality, we want to ensure the selected
          // item comes into view when the floating element is opened.
          forceScrollIntoViewRef.current = true;
          onNavigate();
        }
      } else if (previousMountedRef.current) {
        // Reset the active index when the list is no longer open and mounted (closing or
        // unmounting). `onNavigate` is a stable callback that always forwards to the latest
        // `onNavigate` prop.
        indexRef.current = -1;
        onNavigate();
      }
    },
    { immediate: true },
  );

  // Sync `activeIndex` to be the focused item while the floating element is
  // open.
  watch(
    [open, floatingElement, () => activeIndexRef.current],
    ([openValue, floatingValue, activeIndexValue]) => {
      if (!enabled) {
        return;
      }
      if (!openValue) {
        forceSyncFocusRef.current = false;
        return;
      }
      if (!floatingValue) {
        return;
      }

      if (activeIndexValue == null) {
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
          (keyRef.current != null ||
            (focusItemOnOpenRef.current === true && keyRef.current == null))
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
              // Initially focus the first non-disabled item. `disabledIndices` is deliberately
              // omitted here so attribute-disabled items (`disabled`/`aria-disabled`) are skipped
              // on open even when the consumer passes an empty `disabledIndices` array. Passing it
              // would regress that behavior (see mui/base-ui#2604).
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
      } else if (!isIndexOutOfListBounds(listRef.current, activeIndexValue)) {
        indexRef.current = activeIndexValue;
        focusItem();
        forceScrollIntoViewRef.current = false;
      }
    },
    { immediate: true },
  );

  // Ensure the parent floating element has focus when a nested child closes
  // to allow arrow key navigation to work after the pointer leaves the child.
  watch([floatingElement, domReferenceElement], ([floatingValue, domReferenceValue]) => {
    if (!enabled || floatingValue || !tree || virtual || !previousMountedRef.current) {
      return;
    }

    const nodes = tree.nodesRef.current;
    const parent = nodes.find((node) => node.id === parentId)?.context?.elements.floating;
    // `floatingElement` is null here (see the guard above), so resolve the owner document from an
    // in-DOM element for realm-safety (shadow DOM/iframes): the reference element, falling back to
    // the parent floating element when the reference is virtual (`domReferenceElement` is null).
    const activeEl = activeElement(ownerDocument(domReferenceValue ?? parent ?? null));
    const treeContainsActiveEl = nodes.some(
      (node) => node.context && contains(node.context.elements.floating, activeEl),
    );

    if (parent && !treeContainsActiveEl && isPointerModalityRef.current) {
      parent.focus({ preventScroll: true });
    }
  });

  watch(
    [open, floatingElement],
    ([openValue, floatingValue]) => {
      previousOpenRef.current = openValue;
      previousMountedRef.current = !!floatingValue;
    },
    { immediate: true },
  );

  watch([open], ([openValue]) => {
    if (!openValue) {
      keyRef.current = null;
      focusItemOnOpenRef.current = focusItemOnOpen;
    }
  });

  const syncCurrentTarget = (event: Event) => {
    if (!latestOpenRef.current) {
      return;
    }

    const index = listRef.current.indexOf(event.currentTarget as HTMLElement);
    if (index !== -1 && (indexRef.current !== index || activeIndexRef.current !== index)) {
      indexRef.current = index;
      onNavigate(event);
    }
  };

  const getParentOrientation = () => {
    return (
      parentOrientation ??
      (tree?.nodesRef.current.find((node) => node.id === parentId)?.context?.dataRef?.current
        .orientation as UseListNavigationProps['orientation'])
    );
  };

  const getMinEnabledIndex = () => {
    return getMinListIndex(listRef, disabledIndicesRef.current);
  };

  const commonOnKeyDown = (event: KeyboardEvent) => {
    isPointerModalityRef.current = false;
    forceSyncFocusRef.current = true;

    // When composing a character, Chrome fires ArrowDown twice. Firefox/Safari
    // don't appear to suffer from this. `event.isComposing` is avoided due to
    // Safari not supporting it properly (although it's not needed in the first
    // place for Safari, just avoiding any possible issues).
    if (event.which === 229) {
      return;
    }

    // If the floating element is animating out, ignore navigation. Otherwise,
    // the `activeIndex` gets set to 0 despite not being open so the next time
    // the user ArrowDowns, the first item won't be focused.
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

    // Grid navigation is injected by grid-capable consumers so non-grid
    // consumers (menu, select) tree-shake the grid helpers out.
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
        activeElement((event.currentTarget as Element).ownerDocument) === event.currentTarget
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
  };

  const item: ElementProps['item'] = {
    onFocus(event) {
      forceSyncFocusRef.current = true;
      syncCurrentTarget(event);
    },
    onClick: ({ currentTarget }) => currentTarget.focus({ preventScroll: true }), // Safari
    onMouseMove(event) {
      if (isStationaryWebKitPointer(event)) {
        return;
      }
      forceSyncFocusRef.current = true;
      forceScrollIntoViewRef.current = false;
      if (focusItemOnHover) {
        syncCurrentTarget(event);
      }
    },
    onPointerLeave(event) {
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
          floatingFocusEl.focus({ preventScroll: true });
        }
      }
    },
  };

  // `aria-activedescendant` semantics (per QA: floating-activedescendant-split):
  // - The reference (e.g. the combobox input) always gets `${id}-${activeIndex}` while
  //   virtual, open, and an active index exist — typeable comboboxes included.
  // - The floating (list) side omits it for typeable combobox references.
  const getReferenceAriaActiveDescendant = () => {
    if (!virtual || !open.value || activeIndexRef.current == null) {
      return undefined;
    }
    return `${id}-${activeIndexRef.current}`;
  };

  const getFloatingAriaActiveDescendant = () => {
    if (typeableComboboxReference.value) {
      return undefined;
    }
    return getReferenceAriaActiveDescendant();
  };

  const floating: ElementProps['floating'] = {
    'aria-orientation': orientation === 'both' ? undefined : orientation,
    get 'aria-activedescendant'() {
      return getFloatingAriaActiveDescendant();
    },
    onKeyDown(event: KeyboardEvent) {
      // Close submenu on Shift+Tab
      if (event.key === 'Tab' && event.shiftKey && open.value && !virtual) {
        // If the event originated from within a nested element (e.g., a Dialog opened from
        // within the menu), don't close the menu. The nested element has its own focus
        // management and should handle the Tab key.
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
    onPointerMove(event) {
      if (isStationaryWebKitPointer(event)) {
        return;
      }
      isPointerModalityRef.current = true;
    },
  };

  function openOnNavigationKeyDown(event: KeyboardEvent) {
    store.setOpen(
      true,
      createChangeEventDetails(
        REASONS.listNavigation,
        event,
        event.currentTarget as HTMLElement,
      ),
    );
  }

  function checkVirtualMouse(event: MouseEvent) {
    if (focusItemOnOpen === 'auto' && isVirtualClick(event)) {
      focusItemOnOpenRef.current = !virtual;
    }
  }

  function checkVirtualPointer(event: PointerEvent) {
    // `pointerdown` fires first, reset the state then perform the checks.
    focusItemOnOpenRef.current = focusItemOnOpen;
    if (focusItemOnOpen === 'auto' && isVirtualPointerEvent(event)) {
      focusItemOnOpenRef.current = true;
    }
  }

  const trigger: ElementProps['trigger'] = {
    onKeyDown(event) {
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
    onFocus(event) {
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

  const reference: ElementProps['reference'] = {
    get 'aria-activedescendant'() {
      return getReferenceAriaActiveDescendant();
    },
    ...trigger,
  };

  return enabled ? { reference, floating, item, trigger } : {};
}
