import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { ToolbarRoot } from '../root/ToolbarRoot';

/**
 * A link component.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarLink(componentProps: ToolbarLink.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useToolbarRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, ...elementProps} = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const {orientation} = rootContextRef.value;

  const stateValue: ToolbarLinkState = {
    orientation,
  };

  return (
    <CompositeItem
      tag="a"
      render={render as any}
      className={className as any}
      style={style as any}
      metadata={TOOLBAR_LINK_METADATA as any}
      state={stateValue as any}
      refs={[]}
      props={[unrefs(elementProps)]}
    />
  );
}

const TOOLBAR_LINK_METADATA = {disabled: false, focusableWhenDisabled: false};

export interface ToolbarLinkState {
  /**
   * The component orientation.
   */
  orientation: ToolbarRoot.Orientation;
}

export interface ToolbarLinkProps extends BaseUIComponentProps<'a', ToolbarLinkState> {}

export namespace ToolbarLink {
  export type State = ToolbarLinkState;
  export type Props = ToolbarLinkProps;
}
