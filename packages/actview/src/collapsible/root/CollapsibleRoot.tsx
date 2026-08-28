import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useCollapsibleRoot } from './useCollapsibleRoot';
import { CollapsibleRootContext } from './CollapsibleRootContext';
import { collapsibleStateAttributesMapping } from './stateAttributesMapping';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Groups all parts of the collapsible.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleRoot(componentProps: CollapsibleRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const collapsible = useCollapsibleRoot({
    open: computed(() => componentProps.open),
    defaultOpen: computed(() => componentProps.defaultOpen ?? false),
    // onOpenChange 直接读代理（追踪 props 变化），不经 toValue（避免当 getter）
    onOpenChange: (open: boolean, eventDetails: any) =>
      componentProps.onOpenChange?.(open, eventDetails),
    disabled: computed(() => componentProps.disabled ?? false),
  });

  const state = computed<CollapsibleRootState>(() => ({
    open: collapsible.open.value ?? false,
    disabled: componentProps.disabled ?? false,
    transitionStatus: collapsible.transitionStatus.value,
  }));

  // store-as-is 载体：身份稳定 getter 对象（provide 只跑一次，computed 新对象
  // 会冻结快照）——内部 refs/computed 经 getter 保持实时；disabled 渲染期直读。
  const contextValue: CollapsibleRootContext = {
    ...collapsible,
    onOpenChange: (open: boolean, eventDetails: any) =>
      componentProps.onOpenChange?.(open, eventDetails),
    get state() {
      return state.value;
    },
    get disabled() {
      return componentProps.disabled ?? false;
    },
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CollapsibleRootContext.Provider value={contextValue}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: collapsibleStateAttributesMapping,
          ref: componentProps.ref,
          props: elementProps.value,
        },
      )}
    </CollapsibleRootContext.Provider>
  );
}

export interface CollapsibleRootState {
  open: boolean;
  disabled: boolean;
  transitionStatus: TransitionStatus;
}

export interface CollapsibleRootProps extends BaseUIComponentProps<'div', CollapsibleRootState> {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open?: boolean | undefined;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render an uncontrolled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: CollapsibleRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export type CollapsibleRootChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;
export type CollapsibleRootChangeEventDetails =
  BaseUIChangeEventDetails<CollapsibleRootChangeEventReason>;

export namespace CollapsibleRoot {
  export type State = CollapsibleRootState;
  export type Props = CollapsibleRootProps;
  export type ChangeEventReason = CollapsibleRootChangeEventReason;
  export type ChangeEventDetails = CollapsibleRootChangeEventDetails;
}
