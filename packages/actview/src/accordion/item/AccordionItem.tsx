import {computed, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useCollapsibleRoot } from '@/collapsible/root/useCollapsibleRoot';
import { CollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import type { BaseUIComponentProps } from '@/internals/types';
import type { AccordionRootState } from '../root/AccordionRoot';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import { AccordionItemContext } from './AccordionItemContext';
import { accordionStateAttributesMapping } from './stateAttributesMapping';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Groups an accordion header with the corresponding panel.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionItem(componentProps: AccordionItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传；listItemRef 经 watch 桥接注册到
  // CompositeList（不用 useRootElement）。
  const rootRef = ref<HTMLElement | null>(null);

  const {ref: listItemRef, index} = useCompositeListItem();

  // rootRef → listItemRef（注册到 CompositeList）
  watch(
    rootRef,
    (el) => {
      listItemRef(el as HTMLElement | null);
    },
    {flush: 'post', immediate: true},
  );

  // context 载体直取（store-as-is）：字段为 computed refs 的渲染期 .value 读取。
  const {
    disabled: contextDisabled,
    handleValueChange,
    state: rootState,
    value: openValues,
  } = useAccordionRootContext();

  const fallbackValue = useBaseUiId();

  const value = computed(() => componentProps.value ?? fallbackValue);

  const disabled = computed(() => componentProps.disabled || contextDisabled.value);

  const isOpen = computed(() => (openValues.value as any[]).indexOf(value.value) !== -1);

  const onOpenChange = (nextOpen: boolean, eventDetails: BaseUIChangeEventDetails<any>) => {
    componentProps.onOpenChange?.(nextOpen, eventDetails as any);

    if (eventDetails.isCanceled) {
      return;
    }

    handleValueChange(value.value, nextOpen, eventDetails as any);
  };

  const collapsible = useCollapsibleRoot({
    open: isOpen,
    onOpenChange,
    disabled,
    defaultOpen: computed(() => false),
  });

  const collapsibleState = computed(() => ({
    open: collapsible.open.value ?? false,
    disabled: collapsible.disabled,
    transitionStatus: collapsible.transitionStatus.value,
  }));

  // store-as-is 载体：identity 稳定（spread 的 refs/computed 字段保持实时；
  // state 经 getter 路由——解构会捕获快照）。
  const collapsibleContext: CollapsibleRootContext = {
    ...collapsible,
    onOpenChange,
    get state() {
      return collapsibleState.value;
    },
  };

  const state = computed<AccordionItemState>(() => ({
    ...rootState.value,
    hidden: !isOpen.value && !collapsible.mounted.value,
    index: index.value,
    disabled: disabled.value,
    open: isOpen.value,
  }));

  const defaultTriggerId = useBaseUiId();
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

  const accordionItemContext = {
    defaultTriggerId,
    open: isOpen,
    state,
    setTriggerId,
    triggerId,
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // 组件自定义 props（value/disabled/onOpenChange）剔除——否则泄漏到 DOM。
  const {
    className,
    render,
    style,
    value: _value,
    disabled: _disabled,
    onOpenChange: _onOpenChange,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CollapsibleRootContext.Provider value={collapsibleContext}>
      <AccordionItemContext.Provider value={accordionItemContext}>
        {useRenderElement(
          'div',
          {
            className: className?.value,
            render: render?.value,
            style: style?.value,
          },
          {
            state: state.value,
            stateAttributesMapping: accordionStateAttributesMapping,
            ref: useMergedRefs(rootRef, componentProps.ref as any),
            props: elementProps.value,
          },
        )}
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
    BaseUIComponentProps<'div', AccordionItemState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A unique value that identifies this accordion item.
   * If no value is provided, a unique ID will be generated automatically.
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
