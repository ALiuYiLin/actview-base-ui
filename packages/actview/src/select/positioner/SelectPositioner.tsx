import { computed, ref, unref, watch } from 'actview';
import { inertValue } from '@base-ui/actview-utils/inertValue';
import { useSelectRootContext } from '../root/SelectRootContext';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import type { BaseUIComponentProps } from '../../internals/types';
import {
  useAnchorPositioning,
  type Align,
  type Side,
  type UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import { SelectPositionerContext } from './SelectPositionerContext';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { DROPDOWN_COLLISION_AVOIDANCE } from '../../internals/constants';
import { clearStyles } from '../popup/utils';
import { selectors } from '../store';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { findItemIndex } from '../../internals/itemEquality';
import { usePositioner } from '../../utils/usePositioner';
import { useAnchoredPopupScrollLock } from '../../utils/useAnchoredPopupScrollLock';

const FIXED: Record<string, string> = { position: 'fixed' };

/**
 * Positions the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPositioner(componentProps: SelectPositioner.Props) {
  const {
    render: _render,
    className: _className,
    anchor,
    // `useAnchorPositioning` applies the same defaults to the undefined values; the names
    // remain destructured to exclude the props from `elementProps`.
    positionMethod,
    side,
    align,
    sideOffset,
    alignOffset,
    collisionBoundary = 'clipping-ancestors',
    collisionPadding,
    arrowPadding,
    sticky,
    disableAnchorTracking,
    alignItemWithTrigger = true,
    collisionAvoidance = DROPDOWN_COLLISION_AVOIDANCE,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useSelectRootContext().value!;
  const {
    store,
    listRef,
    labelsRef,
    alignItemWithTriggerActiveRef,
    selectedItemTextRef,
    valuesRef,
    initialValueRef,
    popupRef,
    setValue,
    floatingContext: floatingRootContext,
  } = rootContext;

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const modal = store.useState('modal');
  const value = store.useState('value');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const triggerElement = store.useState('triggerElement');
  const isItemEqualToValue = store.useState('isItemEqualToValue');
  const transitionStatus = store.useState('transitionStatus');

  const scrollUpArrowRef = { current: null as HTMLDivElement | null };
  const scrollDownArrowRef = { current: null as HTMLDivElement | null };

  const controlledAlignItemWithTrigger = ref(alignItemWithTrigger);
  const setControlledAlignItemWithTrigger = (nextValue: boolean) => {
    controlledAlignItemWithTrigger.value = nextValue;
  };

  const alignItemWithTriggerActive = computed(
    () => mounted.value && controlledAlignItemWithTrigger.value && openMethod.value !== 'touch',
  );

  // Sync the controlled value back when the component is not mounted and the prop changed.
  watch(
    [mounted, () => componentProps.alignItemWithTrigger ?? true],
    ([isMounted, nextProp]) => {
      if (!isMounted && controlledAlignItemWithTrigger.value !== nextProp) {
        controlledAlignItemWithTrigger.value = nextProp;
      }
    },
    { immediate: true },
  );

  // Mirror the derived value into the shared ref so `Select.Trigger` can read it on focus.
  watch(
    alignItemWithTriggerActive,
    (nextValue) => {
      alignItemWithTriggerActiveRef.current = nextValue;
    },
    { immediate: true },
  );

  useAnchoredPopupScrollLock(
    computed(() => (alignItemWithTriggerActive.value || modal.value) && open.value),
    computed(() => openMethod.value === 'touch'),
    positionerElement,
    triggerElement,
  );

  const positioning = useAnchorPositioning({
    anchor,
    positionMethod,
    mounted,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    collisionBoundary,
    collisionPadding,
    sticky,
    disableAnchorTracking: disableAnchorTracking ?? alignItemWithTriggerActive.value,
    collisionAvoidance,
    keepMounted: true,
  });

  const renderedSide = computed(() =>
    alignItemWithTriggerActive.value ? 'none' : positioning.side.value,
  );
  const positionerStyles = computed(() =>
    alignItemWithTriggerActive.value ? FIXED : positioning.positionerStyles.value,
  );

  const state = computed<SelectPositionerState>(() => ({
    open: open.value,
    side: renderedSide.value,
    align: positioning.align.value,
    anchorHidden: positioning.anchorHidden.value,
  }));

  watch(
    positioning.side,
    (nextSide) => {
      store.set('popupSide', nextSide);
    },
    { immediate: true },
  );

  const setPositionerElement = store.useStateSetter('positionerElement');

  const getElement = usePositioner(componentProps, state, {
    styles: positionerStyles as unknown as Parameters<typeof usePositioner>[2]['styles'],
    transitionStatus,
    props: elementProps,
    refs: [componentProps.ref, setPositionerElement],
    hidden: computed(() => !mounted.value),
    inert: computed(() => !open.value),
  });

  const prevMapSizeRef = { current: 0 };

  const onMapChange = (map: Map<Element, { index?: number | null | undefined } | null>) => {
    if (valuesRef.current.length === 0) {
      return;
    }

    const prevSize = prevMapSizeRef.current;
    prevMapSizeRef.current = map.size;

    const eventDetails = createChangeEventDetails(REASONS.none);

    if (prevSize !== 0 && !store.state.multiple && value.value !== null) {
      const selectedValueIndex = findItemIndex(valuesRef.current, value.value, isItemEqualToValue.value);
      if (selectedValueIndex === -1) {
        const initialSelectedValue = initialValueRef.current;
        const hasInitial =
          initialSelectedValue != null &&
          findItemIndex(valuesRef.current, initialSelectedValue, isItemEqualToValue.value) !== -1;
        const nextValue = hasInitial ? initialSelectedValue : null;
        setValue(nextValue, eventDetails);

        if (nextValue === null) {
          store.set('selectedIndex', null);
          selectedItemTextRef.current = null;
        }
      }
    }

    if (prevSize !== 0 && store.state.multiple && Array.isArray(value.value)) {
      const nextValue = value.value.filter(
        (selectedItemValue: any) =>
          findItemIndex(valuesRef.current, selectedItemValue, isItemEqualToValue.value) !== -1,
      );
      if (nextValue.length !== value.value.length) {
        setValue(nextValue, eventDetails);

        if (nextValue.length === 0) {
          store.set('selectedIndex', null);
          selectedItemTextRef.current = null;
        }
      }
    }

    if (open.value && alignItemWithTriggerActive.value) {
      store.update({
        scrollUpArrowVisible: false,
        scrollDownArrowVisible: false,
      });

      const stylesToClear: Record<string, string> = { height: '' };
      clearStyles(positionerElement.value, stylesToClear);
      clearStyles(popupRef.current, stylesToClear);
    }
  };

  const contextValue = computed<SelectPositionerContext>(() => ({
    ...positioning,
    side: renderedSide,
    alignItemWithTriggerActive: alignItemWithTriggerActive.value,
    setControlledAlignItemWithTrigger,
    scrollUpArrowRef,
    scrollDownArrowRef,
  }));

  return (
    <CompositeList
      elementsRef={listRef}
      labelsRef={labelsRef}
      onMapChange={onMapChange}
    >
      <SelectPositionerContext.Provider value={contextValue}>
        {mounted.value && modal.value && (
          <InternalBackdrop inert={inertValue(!open.value)} cutout={triggerElement.value} />
        )}
        {getElement()}
      </SelectPositionerContext.Provider>
    </CompositeList>
  );
}

export interface SelectPositionerState {
  /**
   * Whether the component is open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side | 'none';
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
}

export interface SelectPositionerProps
  extends UseAnchorPositioningSharedParameters, BaseUIComponentProps<'div', SelectPositionerState> {
  /**
   * Whether the positioner overlaps the trigger so the selected item's text is aligned with the trigger's value text. This only applies to mouse input and is automatically disabled if there is not enough space.
   * @default true
   */
  alignItemWithTrigger?: boolean | undefined;
}

export namespace SelectPositioner {
  export type State = SelectPositionerState;
  export type Props = SelectPositionerProps;
}
