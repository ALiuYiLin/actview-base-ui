import { toValue, toRefs, unrefs, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { ToolbarGroupContext } from './ToolbarGroupContext';
import type { ToolbarRootState } from '../root/ToolbarRoot';

/**
 * A container for grouping a set of toolbar controls.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarGroup(componentProps: ToolbarGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<ToolbarGroupContext.Provider>`），无 Fragment 根问题。
  const rootRef = useRootElement();

  const rootContextRef = useToolbarRootContext();
  const disabledProp = toValue(componentProps.disabled) ?? false;

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = (): ToolbarRootState => {
    const {orientation, disabled: toolbarDisabled} = rootContextRef.value;
    return {
      disabled: toolbarDisabled || disabledProp,
      orientation,
    };
  };

  const {element} = useRenderElement({
    props: () => [{role: 'group'}, unrefs(elementProps)],
    state: stateFn,
    stateAttributesMapping: {},
    className,
    style,
    render,
    refs: () => [rootRef],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ToolbarGroupContext.Provider value={{disabled: stateFn().disabled} as any}>
      {element()}
    </ToolbarGroupContext.Provider>
  );
}

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
