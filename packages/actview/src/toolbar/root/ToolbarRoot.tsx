import { ref, toValue, toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import { ToolbarRootContext } from './ToolbarRootContext';

/**
 * A container for grouping a set of controls, such as buttons, toggle groups, or menus.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarRoot(componentProps: ToolbarRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const loopFocus = toValue(componentProps.loopFocus);
  const orientation = toValue(componentProps.orientation) ?? 'horizontal';

  const itemMap = ref(new Map<Node, CompositeMetadata<ToolbarRoot.ItemMetadata>>());
  const setItemMap = (m: Map<Node, CompositeMetadata<ToolbarRoot.ItemMetadata>>) => {
    itemMap.value = m;
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const disabledIndices: number[] = [];
  for (const itemMetadata of itemMap.value.values()) {
    // Only items that are disabled and not focusable when disabled
    // are removed from roving focus.
    if (itemMetadata.disabled && !itemMetadata.focusableWhenDisabled) {
      disabledIndices.push(itemMetadata.index);
    }
  }

  const toolbarRootContext: ToolbarRootContext = {
    disabled: disabledProp,
    orientation,
  };

  const stateValue: ToolbarRootState = {disabled: disabledProp, orientation};

  const defaultProps: Record<string, any> = {
    'aria-orientation': orientation,
    role: 'toolbar',
  };

  return (
    <ToolbarRootContext.Provider value={toolbarRootContext as any}>
      <CompositeRoot
        render={render as any}
        className={className as any}
        style={style as any}
        state={stateValue as any}
        refs={[]}
        props={[defaultProps, unrefs(elementProps)]}
        disabledIndices={disabledIndices}
        loopFocus={loopFocus}
        onMapChange={setItemMap}
        orientation={orientation}
      >
        {children?.value}
      </CompositeRoot>
    </ToolbarRootContext.Provider>
  );
}

export interface ToolbarRootItemMetadata {
  disabled: boolean;
  focusableWhenDisabled: boolean;
}

export type ToolbarRootOrientation = 'horizontal' | 'vertical';

export interface ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * The component orientation.
   */
  orientation: ToolbarRoot.Orientation;
}

export interface ToolbarRootProps extends BaseUIComponentProps<'div', ToolbarRootState> {
  disabled?: boolean | undefined;
  /**
   * The orientation of the toolbar.
   * @default 'horizontal'
   */
  orientation?: ToolbarRoot.Orientation | undefined;
  /**
   * If `true`, using keyboard navigation will wrap focus to the other end of the toolbar once the end is reached.
   *
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export namespace ToolbarRoot {
  export type ItemMetadata = ToolbarRootItemMetadata;
  export type Orientation = ToolbarRootOrientation;
  export type State = ToolbarRootState;
  export type Props = ToolbarRootProps;
}
