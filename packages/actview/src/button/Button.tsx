import { computed, defineComponent } from 'actview';
import { useButton } from '../internals/use-button/useButton';
import { getStateAttributesProps } from '../internals/getStateAttributesProps';
import type { BaseUIComponentProps, NativeButtonProps } from '../internals/types';
import { mergePropsN } from '../merge-props';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export const Button = defineComponent(function (componentProps: Button.Props) {
  // ================= setup（只执行一次） =================
  // props 依赖提升为 setup 的 computed——渲染期求值（读 props 代理 → 响应式），
  // useButton 收 MaybeRef 对象参数（对照 Toggle 用户版）
  const disabled = computed(() => componentProps.disabled ?? false);
  const focusableWhenDisabled = computed(() => componentProps.focusableWhenDisabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  // useButton：buttonRef 内部 useRootElement 自取根 DOM，无需转发；
  // composite 不传——useButton 内部从 CompositeRoot context 推导（isCompositeItem）
  const { getButtonProps } = useButton({
    disabled,
    focusableWhenDisabled,
    native: nativeButton,
  });

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      disabled: _disabled, // setup computed 已接管
      focusableWhenDisabled: _focusableWhenDisabled, // setup computed 已接管
      nativeButton: _nativeButton, // setup computed 已接管
      style,
      ...elementProps
    } = componentProps;

    const state: ButtonState = {
      disabled: disabled.value,
    };

    // state → data-* 属性（默认映射：disabled=true → data-disabled=""）
    const stateAttributes = getStateAttributesProps(state);

    // ⚠️ getButtonProps 必须传函数（propsGetter）且放数组最后：它接收 previousProps，
    // 用户 onClick 进入 externalProps，disabled 时内部 return 直接拦截（不调 externalOnClick）。
    // 不能渲染期调用成对象（Toggle 的写法）——那样用户 onClick 挂在事件链外层，
    // disabled 时仍会被调用（useButton 的 onClick 只拦 externalOnClick）。
    // 类型放宽：getButtonProps 事件签名（BaseUIEvent）与 JSX 事件不匹配（tsgo 基线同款）
    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
      getButtonProps,
    ] as any);

    // render 三形态（对照 Toggle 用户版）
    if (typeof render === 'function') {
      return render({ ...merged, ...state });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} />;
    }
    return <button {...merged} />;
  };
}) as (props: Button.Props) => any;

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export interface ButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ButtonState> {
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}
