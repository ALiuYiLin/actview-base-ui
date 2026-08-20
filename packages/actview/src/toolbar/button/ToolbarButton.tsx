import { computed, defineComponent } from 'actview';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { type BaseUIComponentProps, type NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import type { ToolbarRoot, ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';

/**
 * A button that can be used as-is or as a trigger for other components.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export const ToolbarButton = defineComponent(function (componentProps: ToolbarButton.Props) {
  // context hooks 必须在 setup 顶层（AD-42）
  const rootContext = useToolbarRootContext();
  const groupContext = useToolbarGroupContext();

  const disabled = computed(
    () =>
      (rootContext.value.disabled ?? false) ||
      (groupContext.value?.disabled ?? false) ||
      (componentProps.disabled ?? false),
  );

  const focusableWhenDisabled = computed(() => componentProps.focusableWhenDisabled ?? true);

  // useButton：MaybeRef 对象参数（computed 渲染期求值 → 响应式）；
  // buttonRef 内部 useRootElement 自取根 DOM，无需转发给 CompositeItem
  const { getButtonProps } = useButton({
    disabled,
    focusableWhenDisabled,
    native: computed(() => componentProps.nativeButton ?? true),
  });

  return () => {
    const {
      className,
      disabled: _disabled, // setup computed 已接管
      focusableWhenDisabled: _focusableWhenDisabled, // setup computed 已接管
      nativeButton: _nativeButton, // setup computed 已接管
      render,
      style,
      ref: _ref, // 用户 ref：CompositeItem 内部 useRootElement 自取根，无需转发
      ...elementProps
    } = componentProps;

    const itemMetadata: ToolbarRoot.ItemMetadata = {
      disabled: disabled.value,
      focusableWhenDisabled: focusableWhenDisabled.value,
    };

    const state: ToolbarButtonState = {
      disabled: disabled.value,
      orientation: rootContext.value.orientation,
      focusable: focusableWhenDisabled.value,
    };

    // When a render prop is provided (typically another Base UI component
    // like Menu.Trigger), forward `disabled` so the rendered component can
    // derive its own disabled state. For the default toolbar button, avoid
    // forwarding a disabled prop so focusable disabled buttons remain
    // hoverable for interactions like tooltips.
    // TODO: follow up after https://github.com/mui/base-ui/issues/1976#issuecomment-2916905663
    // ⚠️ 必须是对象不是函数：mergePropsN 把函数当 propsGetter（替换语义——返回值
    // 整体替换 merged），返回 EMPTY_OBJECT 会冲掉前面 elementProps 的用户透传属性
    // （data-testid 等）。渲染期求值（读 componentProps.render + disabled.value → 响应式）
    const conditionalDisabledProps = componentProps.render
      ? { disabled: disabled.value }
      : EMPTY_OBJECT;

    return (
      <CompositeItem<ToolbarRoot.ItemMetadata, ToolbarButtonState>
        tag="button"
        render={render}
        className={className}
        style={style}
        metadata={itemMetadata}
        state={state}
        props={[elementProps, conditionalDisabledProps, getButtonProps]}
      />
    );
  };
}) as (props: ToolbarButton.Props) => any;

export interface ToolbarButtonState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToolbarButtonState> {
  /**
   * When `true` the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When `true` the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace ToolbarButton {
  export type State = ToolbarButtonState;
  export type Props = ToolbarButtonProps;
}
