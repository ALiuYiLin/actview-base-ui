import { computed, defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergeClassNames, mergeStyles } from '@/utils/mergeClassNames';
import { useCollapsibleRoot, type UseCollapsibleRootReturnValue } from './useCollapsibleRoot';
import { CollapsibleRootContext } from './CollapsibleRootContext';
import { collapsibleStateAttributesMapping } from './stateAttributesMapping';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

/**
 * Groups all parts of the collapsible.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export const CollapsibleRoot = defineComponent(function (componentProps: CollapsibleRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const stateValue = toValue(state);

    const stateAttributes = getStateAttributesProps(stateValue, collapsibleStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue, ref: rootRef});
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className = mergeClassNames(merged.className, renderClassName);
        mergedRenderProps.style = mergeStyles(merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <div {...merged} ref={rootRef} />;
    }

    return (
      <CollapsibleRootContext.Provider value={contextValue}>{element}</CollapsibleRootContext.Provider>
    );
  };
}) as unknown as (props: CollapsibleRoot.Props) => JSX.Element;

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
