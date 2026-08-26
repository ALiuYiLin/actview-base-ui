import { toValue, toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { useFocusableWhenDisabled } from '@/utils/useFocusableWhenDisabled';

/**
 * A text input that can be used in the toolbar.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarInput(componentProps: ToolbarInput.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const focusableWhenDisabled = toValue(componentProps.focusableWhenDisabled) ?? true;
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const rootContextRef = useToolbarRootContext();
  const groupContextRef = useToolbarGroupContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, ...elementProps} = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const {disabled: toolbarDisabled, orientation} = rootContextRef.value;
  const groupContext = groupContextRef.value;

  const disabled = toolbarDisabled || (groupContext?.disabled ?? false) || disabledProp;

  const itemMetadata = {disabled, focusableWhenDisabled};

  const {props: focusableWhenDisabledProps} = useFocusableWhenDisabled({
    composite: true,
    disabled,
    focusableWhenDisabled,
    isNativeButton: false,
  });

  const stateValue: ToolbarInputState = {
    disabled,
    orientation,
    focusable: focusableWhenDisabled,
  };

  const preventWhenDisabled = (event: any) => {
    if (disabled) {
      event.preventDefault();
    }
  };

  const defaultProps: Record<string, any> = {
    onClick: preventWhenDisabled,
    onPointerDown: preventWhenDisabled,
  };

  return (
    <CompositeItem
      tag="input"
      render={render as any}
      className={className as any}
      style={style as any}
      metadata={itemMetadata as any}
      state={stateValue as any}
      refs={[]}
      props={[defaultProps, unrefs(elementProps), focusableWhenDisabledProps.value]}
    />
  );
}

export interface ToolbarInputState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarInputProps extends BaseUIComponentProps<'input', ToolbarInputState> {
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

export namespace ToolbarInput {
  export type State = ToolbarInputState;
  export type Props = ToolbarInputProps;
}
