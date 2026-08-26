import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { ToolbarGroupContext } from './ToolbarGroupContext';
import type { ToolbarRootState } from '../root/ToolbarRoot';

/**
 * A container for grouping a set of toolbar controls.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export const ToolbarGroup = defineComponent(function (componentProps: ToolbarGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useToolbarRootContext();
  const disabledProp = toValue(componentProps.disabled) ?? false;

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const {orientation, disabled: toolbarDisabled} = rootContextRef.value;

    const disabled = toolbarDisabled || disabledProp;

    const contextValue: ToolbarGroupContext = {
      disabled,
    };

    const stateValue: ToolbarRootState = {
      disabled,
      orientation,
    };

    const {element} = useRenderElement({
      props: () => [{role: 'group'}, elementProps],
      state: stateValue,
      stateAttributesMapping: {},
      className: () => className,
      style: () => style,
      render: () => render,
      refs: () => [rootRef],
      defaultTag: 'div',
    });

    return (
      <ToolbarGroupContext.Provider value={contextValue as any}>{element()}</ToolbarGroupContext.Provider>
    );
  };
}) as unknown as (props: ToolbarGroup.Props) => JSX.Element;

export interface ToolbarGroupState extends ToolbarRootState {}

export interface ToolbarGroupProps extends BaseUIComponentProps<'div', ToolbarGroupState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ToolbarGroup {
  export type State = ToolbarGroupState;
  export type Props = ToolbarGroupProps;
}
