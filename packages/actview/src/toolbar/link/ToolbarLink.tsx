import { computed, defineComponent } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import type { ToolbarRoot } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';

const TOOLBAR_LINK_METADATA = {
  // Links cannot be disabled, but they still occupy a focusable composite item slot.
  disabled: false,
  focusableWhenDisabled: true,
};

/**
 * A link component.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export const ToolbarLink = defineComponent(function (componentProps: ToolbarLink.Props) {
  // context hook 必须在 setup 顶层（AD-42）
  const rootContext = useToolbarRootContext();

  return () => {
    const {
      className,
      render,
      style,
      ref: _ref, // 用户 ref：CompositeItem 内部 useRootElement 自取根，无需转发
      ...elementProps
    } = componentProps;

    const state: ToolbarLinkState = {
      orientation: rootContext.value.orientation,
    };

    return (
      <CompositeItem<ToolbarRoot.ItemMetadata, ToolbarLinkState>
        tag="a"
        render={render}
        className={className}
        style={style}
        metadata={TOOLBAR_LINK_METADATA}
        state={state}
        props={[elementProps]}
      />
    );
  };
}) as (props: ToolbarLink.Props) => any;

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
