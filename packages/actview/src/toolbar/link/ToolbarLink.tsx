import { defineComponent, toValue } from 'actview';
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
export const ToolbarLink = defineComponent(function (componentProps: ToolbarLink.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useToolbarRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

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
        props={[elementProps]}
      />
    );
  };
}) as unknown as (props: ToolbarLink.Props) => JSX.Element;

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
