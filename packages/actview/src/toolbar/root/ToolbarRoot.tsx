import { computed, defineComponent, ref } from 'actview';
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
export const ToolbarRoot = defineComponent(function (componentProps: ToolbarRoot.Props) {
  // ================= setup（只执行一次） =================
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

  // ================= render（每次更新执行） =================
  return () => {
    const {
      disabled: _disabled, // setup computed 已接管
      loopFocus,
      orientation: _orientation, // setup computed 已接管
      className,
      render,
      style,
      ref: _ref, // 用户 ref：CompositeRoot 内部 useRootElement 自取根，无需转发
      ...elementProps
    } = componentProps;

    const state: ToolbarRootState = {
      disabled: componentProps.disabled ?? false,
      orientation: orientation.value,
    };

    const defaultProps: HTMLProps = {
      'aria-orientation': orientation.value,
      role: 'toolbar',
    };

    return (
      <ToolbarRootContext.Provider value={toolbarRootContext.value}>
        <CompositeRoot<ToolbarRoot.ItemMetadata, ToolbarRootState>
          render={render}
          className={className}
          style={style}
          state={state}
          props={[defaultProps, elementProps]}
          disabledIndices={disabledIndices.value}
          loopFocus={loopFocus}
          onMapChange={(map) => {
            itemMap.value = map;
          }}
          orientation={orientation.value}
        />
      </ToolbarRootContext.Provider>
    );
  };
}) as (props: ToolbarRoot.Props) => any;

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
