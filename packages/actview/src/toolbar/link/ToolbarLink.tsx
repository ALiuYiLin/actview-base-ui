import { computed } from 'actview';
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
export function ToolbarLink(componentProps: ToolbarLink.Props) {
  const rootContext = useToolbarRootContext();

  const state = computed<ToolbarLinkState>(() => ({
    orientation: rootContext.value.orientation,
  }));

  const getElementProps = () => {
    const {
      className: _className,
      render: _render,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  return (
    <CompositeItem<ToolbarRoot.ItemMetadata, ToolbarLinkState>
      tag="a"
      render={componentProps.render}
      className={componentProps.className as any}
      style={componentProps.style as any}
      metadata={TOOLBAR_LINK_METADATA}
      state={state.value}
      refs={[componentProps.ref]}
      props={[getElementProps]}
    />
  );
}

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
