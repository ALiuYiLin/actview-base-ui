import { computed, toValue, toRefs, unrefs, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useCollapsibleRoot, type UseCollapsibleRootReturnValue } from './useCollapsibleRoot';
import { CollapsibleRootContext } from './CollapsibleRootContext';
import { collapsibleStateAttributesMapping } from './stateAttributesMapping';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * Groups all parts of the collapsible.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleRoot(componentProps: CollapsibleRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<CollapsibleRootContext.Provider>`），无 Fragment 根问题。
  const rootRef = useRootElement();

  const collapsible = useCollapsibleRoot({
    open: () => toValue(componentProps.open),
    defaultOpen: () => toValue(componentProps.defaultOpen) ?? false,
    // onOpenChange 直接读代理（追踪 props 变化），不经 toValue（避免当 getter）
    onOpenChange: (open: boolean, eventDetails: any) =>
      componentProps.onOpenChange?.(open, eventDetails),
    disabled: () => toValue(componentProps.disabled) ?? false,
  });

  const state = computed<CollapsibleRootState>(() => ({
    open: toValue(collapsible.open) ?? false,
    disabled: collapsible.disabled,
    transitionStatus: toValue(collapsible.transitionStatus),
  }));

  // 稳定引用（Provider watch value——对象本身不变，内部 computed 响应式，
  // 消费方 render 读 .value 建立追踪）
  const contextValue: CollapsibleRootContext = {
    ...collapsible,
    onOpenChange: (open: boolean, eventDetails: any) =>
      componentProps.onOpenChange?.(open, eventDetails),
    state,
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state,
    stateAttributesMapping: collapsibleStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CollapsibleRootContext.Provider value={contextValue}>{element()}</CollapsibleRootContext.Provider>
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
   * To render a controlled collapsible, use the `open` prop instead.
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
