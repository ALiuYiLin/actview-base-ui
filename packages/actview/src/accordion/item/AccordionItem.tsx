import { computed, ref, toValue, useRootElement, watch, toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import {
  useCollapsibleRoot,
  type UseCollapsibleRootParameters,
} from '@/collapsible/root/useCollapsibleRoot';
import type { CollapsibleRoot, CollapsibleRootState } from '@/collapsible/root/CollapsibleRoot';
import { CollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import type { AccordionRootState } from '../root/AccordionRoot';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import { AccordionItemContext } from './AccordionItemContext';
import { accordionStateAttributesMapping } from './stateAttributesMapping';
import { type BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { AccordionItemDataAttributes } from '../AccordionDataAttributes';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Groups an accordion header with the corresponding panel.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionItem(componentProps: AccordionItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const {ref: listItemRef, index} = useCompositeListItem();

  // rootRef → listItemRef（注册到 CompositeList）
  watch(
    rootRef,
    (el) => {
      listItemRef(el as HTMLElement | null);
    },
    {flush: 'post', immediate: true},
  );

  const {disabled: contextDisabled, handleValueChange, state: rootState, value: openValues} =
    toValue(useAccordionRootContext());

  const fallbackValue = useBaseUiId();

  const value = computed(() => toValue(componentProps.value) ?? fallbackValue);

  const disabled = computed(() => toValue(componentProps.disabled) || toValue(contextDisabled));

  const isOpen = computed(() => (toValue(openValues) as any[]).indexOf(value.value) !== -1);

  const onOpenChange = (nextOpen: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => {
    // onOpenChange 是函数 prop——直接调用（toValue 会把它当 getter）
    componentProps.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    handleValueChange(value.value, nextOpen, eventDetails);
  };

  const collapsible = useCollapsibleRoot({
    open: isOpen,
    onOpenChange,
    disabled,
  });

  const collapsibleState = computed<CollapsibleRootState>(() => ({
    open: toValue(collapsible.open) ?? false,
    disabled: collapsible.disabled,
    transitionStatus: toValue(collapsible.transitionStatus),
  }));

  const collapsibleContext: CollapsibleRootContext = {
    ...collapsible,
    onOpenChange,
    state: collapsibleState,
  };

  const state = computed<AccordionItemState>(() => ({
    ...toValue(rootState),
    hidden: !isOpen.value && !toValue(collapsible.mounted),
    index: toValue(index),
    disabled: disabled.value,
    open: isOpen.value,
  }));

  const defaultTriggerId = useBaseUiId();
  // `undefined` uses the initial generated fallback; `null` means the trigger unmounted.
  const registeredTriggerId = ref<string | null | undefined>(undefined);
  const setTriggerId = (
    valueUpdate:
      | string
      | null
      | undefined
      | ((current: string | null | undefined) => string | null | undefined),
  ) => {
    registeredTriggerId.value =
      typeof valueUpdate === 'function' ? valueUpdate(registeredTriggerId.value) : valueUpdate;
  };
  const triggerId = computed(() =>
    registeredTriggerId.value === null ? undefined : (registeredTriggerId.value ?? defaultTriggerId),
  );

  const accordionItemContext: AccordionItemContext = {
    defaultTriggerId,
    open: isOpen,
    state,
    setTriggerId,
    triggerId,
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: () => toValue(state),
    stateAttributesMapping: accordionStateAttributesMapping,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CollapsibleRootContext.Provider value={collapsibleContext}>
      <AccordionItemContext.Provider value={accordionItemContext}>
        {element()}
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


