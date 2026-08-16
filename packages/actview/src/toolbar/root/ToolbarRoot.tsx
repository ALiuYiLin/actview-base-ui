import { computed, ref } from 'actview';
import {
  type BaseUIComponentProps,
  type Orientation as BaseOrientation,
  type HTMLProps,
} from '../../internals/types';
import { CompositeRoot } from '../../internals/composite/root/CompositeRoot';
import type { CompositeMetadata } from '../../internals/composite/list/CompositeList';
import { ToolbarRootContext } from './ToolbarRootContext';

/**
 * A container for grouping a set of controls, such as buttons, toggle groups, or menus.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarRoot(componentProps: ToolbarRoot.Props) {
  const itemMap = ref(new Map<Node, CompositeMetadata<ToolbarRoot.ItemMetadata>>());

  const disabledIndices = computed(() => {
    const output: number[] = [];
    for (const itemMetadata of itemMap.value.values()) {
      // Only items that are disabled and not focusable when disabled
      // are removed from roving focus.
      if (itemMetadata.disabled && !itemMetadata.focusableWhenDisabled) {
        output.push(itemMetadata.index);
      }
    }
    return output;
  });

  const orientation = computed(() => componentProps.orientation ?? 'horizontal');

  const toolbarRootContext = computed<ToolbarRootContext>(() => ({
    disabled: componentProps.disabled ?? false,
    orientation: orientation.value,
  }));

  const state = computed<ToolbarRootState>(() => ({
    disabled: componentProps.disabled ?? false,
    orientation: orientation.value,
  }));

  const getDefaultProps = (): HTMLProps => ({
    'aria-orientation': orientation.value,
    role: 'toolbar',
  });

  const getElementProps = () => {
    const {
      disabled: _disabled,
      loopFocus: _loopFocus,
      orientation: _orientation,
      className: _className,
      render: _render,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  return (
    <ToolbarRootContext.Provider value={toolbarRootContext}>
      <CompositeRoot<ToolbarRoot.ItemMetadata, ToolbarRootState>
        render={componentProps.render}
        className={componentProps.className as any}
        style={componentProps.style as any}
        state={state.value}
        refs={[componentProps.ref]}
        props={[getDefaultProps, getElementProps]}
        disabledIndices={disabledIndices.value}
        loopFocus={componentProps.loopFocus}
        onMapChange={(map) => {
          itemMap.value = map;
        }}
        orientation={orientation.value}
      />
    </ToolbarRootContext.Provider>
  );
}

export interface ToolbarRootItemMetadata {
  disabled: boolean;
  focusableWhenDisabled: boolean;
}

export type ToolbarRootOrientation = BaseOrientation;

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
