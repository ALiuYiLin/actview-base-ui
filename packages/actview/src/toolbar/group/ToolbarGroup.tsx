import { computed } from 'actview';
import { useRenderElement } from '../../internals/useRenderElement';
import { type BaseUIComponentProps } from '../../internals/types';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import type { ToolbarRootState } from '../root/ToolbarRoot';
import { ToolbarGroupContext } from './ToolbarGroupContext';

/**
 * Groups several toolbar items or toggles.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarGroup(componentProps: ToolbarGroup.Props) {
  const rootContext = useToolbarRootContext();

  const disabled = computed(
    () => (rootContext.value.disabled ?? false) || (componentProps.disabled ?? false),
  );

  const contextValue = computed<ToolbarGroupContext>(() => ({
    disabled: disabled.value,
  }));

  const state = computed<ToolbarRootState>(() => ({
    disabled: disabled.value,
    orientation: rootContext.value.orientation,
  }));

  const getElementProps = () => {
    const {
      className: _className,
      disabled: _disabled,
      render: _render,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [() => ({ role: 'group' }), getElementProps],
  });

  return <ToolbarGroupContext.Provider value={contextValue}>{getElement()}</ToolbarGroupContext.Provider>;
}

export interface ToolbarGroupState extends ToolbarRootState {}

export interface ToolbarGroupProps extends BaseUIComponentProps<'div', ToolbarGroupState> {
  /**
   * When `true` all toolbar items in the group are disabled.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ToolbarGroup {
  export type State = ToolbarGroupState;
  export type Props = ToolbarGroupProps;
}
