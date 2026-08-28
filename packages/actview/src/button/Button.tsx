import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export function Button(componentProps: Button.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // useButton：disabled/focusableWhenDisabled 用 getter（渲染期实时）；
  // buttonRef（函数 ref）并入 params.ref 合并链，随透传到达最终渲染元素
  // （不用 useRootElement/watch 桥接）。
  const {getButtonProps, buttonRef} = useButton({
    disabled: () => componentProps.disabled ?? false,
    focusableWhenDisabled: () => componentProps.focusableWhenDisabled,
    native: () => componentProps.nativeButton ?? true,
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {(() => {
        // 渲染期解构（每次渲染执行——props 直读响应式）：
        // render/className/style 进 hook 的 componentProps；
        // disabled/focusableWhenDisabled/nativeButton 由 state 与 getButtonProps 承担；
        // 其余 props 透传（getButtonProps 以外部 props 为基础合并，事件链右→左）。
        const {
          render,
          className,
          style,
          disabled,
          focusableWhenDisabled,
          nativeButton,
          ...elementProps
        } = componentProps;

        return useRenderElement(
          'button',
          {
            className,
            render,
            style,
          },
          {
            state: {disabled: disabled ?? false},
            ref: useMergedRefs(buttonRef, componentProps.ref),
            props: [elementProps, (prev: any) => getButtonProps(prev)],
          },
        );
      })()}
    </>
  );
}

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export interface ButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ButtonState> {
  /**
   * Whether the button should be disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * The `type` attribute of the native button element.
   */
  type?: 'button' | 'submit' | 'reset' | undefined;
  /**
   * The `form` attribute of the native button element.
   */
  form?: string | undefined;
  /**
   * The `name` attribute of the native button element.
   */
  name?: string | undefined;
}

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}
