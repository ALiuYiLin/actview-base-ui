import { defineComponent, toValue, useRootElement, watch } from 'actview';
import { triggerOpenStateMapping } from '@/utils/collapsibleOpenStateMapping';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { mergeProps } from '@/merge-props';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import { type CollapsibleRootState } from '../root/CollapsibleRoot';

const stateAttributesMapping: StateAttributesMapping<CollapsibleRootState> = {
  ...triggerOpenStateMapping,
  ...transitionStatusMapping,
};

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export const CollapsibleTrigger = defineComponent(function (componentProps: CollapsibleTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();
  const {panelId, open, handleTrigger, state, disabled: contextDisabled} = toValue(
    useCollapsibleRootContext(),
  );

  const {getButtonProps, buttonRef} = useButton({
    disabled: () => toValue(componentProps.disabled) ?? toValue(contextDisabled),
    focusableWhenDisabled: true,
    native: () => toValue(componentProps.nativeButton) ?? true,
  });

  // rootRef → buttonRef（actview JSX ref 只能绑一个——watch 桥接，同 Button 模式）
  watch(
    rootRef,
    (el) => {
      buttonRef(el as HTMLButtonElement | null);
    },
    {flush: 'post', immediate: true},
  );

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {
      className,
      disabled: _disabled,
      render,
      nativeButton: _nativeButton,
      style,
      ...elementProps
    } = componentProps;

    const stateValue = toValue(state);

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged: HTMLProps = mergeProps(
      {
        'aria-controls': toValue(open) ? toValue(panelId) : undefined,
        'aria-expanded': toValue(open),
        onClick: handleTrigger,
      },
      elementProps,
      stateAttributes,
      getButtonProps(),
    );

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

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <button {...merged} ref={rootRef} />;
  };
}) as unknown as (props: CollapsibleTrigger.Props) => JSX.Element;

export interface CollapsibleTriggerState extends CollapsibleRootState {}

export interface CollapsibleTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', CollapsibleTriggerState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
  export type Props = CollapsibleTriggerProps;
}
