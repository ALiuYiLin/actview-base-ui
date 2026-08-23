import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { ToolbarGroupContext } from './ToolbarGroupContext';
import type { ToolbarRootState } from '../root/ToolbarRoot';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

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

    const stateAttributes = getStateAttributesProps(stateValue, {});

    const merged: HTMLProps = {};
    Object.assign(merged, {role: 'group'}, elementProps, stateAttributes);
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
        element = render({...merged, ...stateValue, ref: rootRef} as any);
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <div {...merged} ref={rootRef} />;
    }

    return (
      <ToolbarGroupContext.Provider value={contextValue as any}>{element}</ToolbarGroupContext.Provider>
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
