import { defineComponent, toValue, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergeProps } from '@/merge-props';
import { useButton } from '@/internals/use-button/useButton';
import { mergeClassNames, mergeStyles } from '@/utils/mergeClassNames';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export const Button = defineComponent(function (componentProps: Button.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();
  const {getButtonProps, buttonRef} = useButton({
    disabled: () => toValue(componentProps.disabled) ?? false,
    focusableWhenDisabled: () => toValue(componentProps.focusableWhenDisabled),
    native: () => toValue(componentProps.nativeButton) ?? true,
  });

  // useButton 的 buttonRef 同步到 useRootElement 的根元素（渲染提交后）——
  // React 版把两个 ref 合并传给元素；actview 的 JSX ref 只能绑定一个，
  // 这里 watch rootRef 转发（flush post 对齐 useIsoLayoutEffect 时序）。
  watch(
    rootRef,
    (el) => {
      buttonRef(el as HTMLElement | null);
    },
    {flush: 'post', immediate: true},
  );

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {
      render,
      className,
      disabled = false,
      focusableWhenDisabled = false,
      nativeButton = true,
      style,
      ...elementProps
    } = componentProps;

    const state: ButtonState = {
      disabled,
    };

    // state → data-* 属性（React 契约：state 默认映射 data-{key}，如
    // disabled → data-disabled；getStateAttributesProps 无 mapping 时走默认分支）
    const stateAttributes = getStateAttributesProps(state);

    // merged 顺序对齐 React 契约：getButtonProps（含 elementProps 事件 +
    // focusableWhenDisabled + type/role）→ stateAttributes → className/style 后置覆盖。
    const merged: HTMLProps = {};
    Object.assign(merged, getButtonProps(elementProps as any), stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(state);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(state);
    } else if (style !== undefined) {
      merged.style = style;
    }

    // render 三形态（MIGRATION.md case 3：VNode 分支按 React 契约**合并**——
    // React useRenderElement 用 mergeProps(outProps, render.props) 合并：
    // 事件处理器链式合并（两个都调用）、className 拼接（render 在前）、
    // style 浅合并（render 覆盖），ref 由组件兜底放最后）
    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = mergeProps(merged, restRenderProps);
      mergedRenderProps.className = mergeClassNames(merged.className, renderClassName);
      mergedRenderProps.style = mergeStyles(merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <button {...merged} ref={rootRef} />;
  };
}) as unknown as (props: Button.Props) => JSX.Element;

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
  // 原生 <button> 专属属性（actview 的 BaseUIComponentProps 基于通用
  // HTMLAttributes，不含元素专属字段——对齐 React ComponentPropsWithRef<'button'>）
  type?: 'submit' | 'reset' | 'button' | undefined;
  name?: string | undefined;
  value?: string | undefined;
  form?: string | undefined;
}

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}
