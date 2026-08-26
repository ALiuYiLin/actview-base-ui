import { toValue, toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import type { ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { EMPTY_OBJECT } from '@/utils/empty';

/**
 * A button that can be used as-is or as a trigger for other components.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarButton(componentProps: ToolbarButton.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const focusableWhenDisabled = toValue(componentProps.focusableWhenDisabled) ?? true;
  const nativeButton = toValue(componentProps.nativeButton);
  const rootContextRef = useToolbarRootContext();
  const groupContextRef = useToolbarGroupContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, ...elementProps} = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const {disabled: toolbarDisabled, orientation} = rootContextRef.value;
  const groupContext = groupContextRef.value;

  const disabled = toolbarDisabled || (groupContext?.disabled ?? false) || disabledProp;

  const itemMetadata = {disabled, focusableWhenDisabled};

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    focusableWhenDisabled,
    native: nativeButton,
  });

  const stateValue: ToolbarButtonState = {
    disabled,
    orientation,
    focusable: focusableWhenDisabled,
  };

  return (
    <CompositeItem
      tag="button"
      render={render as any}
      className={className as any}
      style={style as any}
      metadata={itemMetadata as any}
      state={stateValue as any}
      refs={[buttonRef]}
      props={[
        unrefs(elementProps),
        // When a render prop is provided (typically another Base UI component
        // like Menu.Trigger), forward `disabled` so the rendered component can
        // derive its own disabled state. For the default toolbar button, avoid
        // forwarding a React `disabled` prop so focusable disabled buttons remain
        // hoverable for interactions like tooltips.
        // TODO: follow up after https://github.com/mui/base-ui/issues/1976#issuecomment-2916905663
        render ? {disabled} : EMPTY_OBJECT,
        getButtonProps,
      ]}
    />
  );
}

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
