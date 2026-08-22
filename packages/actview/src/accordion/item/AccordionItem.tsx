import { computed, ref, watch } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import {
  useCollapsibleRoot,
  type UseCollapsibleRootParameters,
} from '@/collapsible/root/useCollapsibleRoot';
import type { CollapsibleRoot, CollapsibleRootState } from '@/collapsible/root/CollapsibleRoot';
import { CollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import type { AccordionRootState } from '@/accordion/root/AccordionRoot';
import { useAccordionRootContext } from '@/accordion/root/AccordionRootContext';
import { AccordionItemContext } from '@/accordion/item/AccordionItemContext';
import { accordionStateAttributesMapping } from '@/accordion/item/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import { type BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';

/**
 * Groups an accordion header with the corresponding panel.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionItem(componentProps: AccordionItem.Props) {
  const rootContext = useAccordionRootContext();

  const { ref: listItemRef, index } = useCompositeListItem();
  const mergedRef = useMergedRefs(componentProps.ref, listItemRef);

  const defaultTriggerId = useBaseUiId();
  // Keeps a stable fallback reference for `value` before the fallback id is assigned.
  const defaultTriggerIdRef = { current: defaultTriggerId };

  const value = computed(() => componentProps.value ?? defaultTriggerIdRef.current);
  // `componentProps.disabled` is typed as `MaybeRefOrGetter<boolean> | undefined` because
  // `AccordionItemProps` picks `disabled` from `UseCollapsibleRootParameters`; actview props
  // are plain values here, so unwrap through `toValue` to a concrete boolean.
  const disabled = computed<boolean>(() => {
    const propDisabled = componentProps.disabled;
    return Boolean(
      (typeof propDisabled === 'function' ? propDisabled() : (propDisabled as boolean)) ||
        rootContext.value.disabled,
    );
  });
  const isOpen = computed(() => rootContext.value.value.indexOf(value.value) !== -1);

  // `undefined` uses the initial generated fallback; `null` means the trigger unmounted.
  const registeredTriggerId = ref<string | null | undefined>(undefined);
  const triggerId = computed(() =>
    registeredTriggerId.value === null
      ? undefined
      : (registeredTriggerId.value ?? defaultTriggerId),
  );

  const onOpenChange = (
    nextOpen: boolean,
    eventDetails: CollapsibleRoot.ChangeEventDetails,
  ) => {
    componentProps.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    rootContext.value.handleValueChange(value.value, nextOpen, eventDetails);
  };

  const collapsible = useCollapsibleRoot({
    open: isOpen,
    onOpenChange,
    disabled,
  });

  const collapsibleState = computed<CollapsibleRootState>(() => ({
    open: collapsible.open.value,
    disabled: collapsible.disabled.value,
    transitionStatus: collapsible.transitionStatus.value,
  }));

  const collapsibleContext = computed<CollapsibleRootContext>(() => ({
    defaultPanelId: collapsible.defaultPanelId,
    disabled: collapsible.disabled.value,
    handleTrigger: collapsible.handleTrigger,
    mounted: collapsible.mounted.value,
    open: collapsible.open.value,
    panelId: collapsible.panelId.value,
    setMounted: collapsible.setMounted,
    setOpen: collapsible.setOpen,
    setPanelIdState: collapsible.setPanelIdState,
    transitionStatus: collapsible.transitionStatus.value,
    onOpenChange,
    state: collapsibleState.value,
  }));

  const state = computed<AccordionItemState>(() => ({
    ...rootContext.value.state,
    hidden: !isOpen.value && !collapsible.mounted.value,
    index: index.value,
    disabled: disabled.value,
    open: isOpen.value,
  }));

  const accordionItemContext = computed<AccordionItemContext>(() => ({
    defaultTriggerId,
    open: isOpen.value,
    state: state.value,
    setTriggerId: (action) => {
      registeredTriggerId.value =
        typeof action === 'function' ? action(registeredTriggerId.value) : action;
    },
    triggerId: triggerId.value,
  }));

  function getElementProps(prev: HTMLProps) {
    const {
      render: _render,
      className: _className,
      disabled: _disabled,
      onOpenChange: _onOpenChange,
      value: _value,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  }

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: mergedRef,
    props: [getElementProps],
    stateAttributesMapping: accordionStateAttributesMapping,
  });

  return (
    <CollapsibleRootContext.Provider value={collapsibleContext}>
      <AccordionItemContext.Provider value={accordionItemContext}>
        {getElement()}
      </AccordionItemContext.Provider>
    </CollapsibleRootContext.Provider>
  );
}

export interface AccordionItemState extends AccordionRootState {
  /**
   * Whether the accordion item's panel is currently hidden.
   */
  hidden: boolean;
  /**
   * The item index.
   */
  index: number;
  /**
   * Whether the component is open.
   */
  open: boolean;
}

export interface AccordionItemProps
  extends
    BaseUIComponentProps<'div', AccordionItemState>,
    Partial<Pick<UseCollapsibleRootParameters, 'disabled'>> {
  /**
   * A unique value that identifies this accordion item.
   * If no value is provided, a unique ID will be generated automatically.
   * Use when controlling the accordion programmatically, or to set an initial
   * open state.
   * @example
   * ```tsx
   * <Accordion.Root value={['a']}>
   *   <Accordion.Item value="a" /> // initially open
   *   <Accordion.Item value="b" /> // initially closed
   * </Accordion.Root>
   * ```
   */
  value?: any;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: AccordionItem.ChangeEventDetails) => void)
    | undefined;
}

export type AccordionItemChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;

export type AccordionItemChangeEventDetails =
  BaseUIChangeEventDetails<AccordionItem.ChangeEventReason>;

export namespace AccordionItem {
  export type State = AccordionItemState;
  export type Props = AccordionItemProps;
  export type ChangeEventReason = AccordionItemChangeEventReason;
  export type ChangeEventDetails = AccordionItemChangeEventDetails;
}
