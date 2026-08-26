import { toValue, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergeProps } from '@/merge-props';
import { useButton } from '@/internals/use-button/useButton';
import { mergeClassNames, mergeStyles } from '@/utils/mergeClassNames';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export function Button(componentProps: Button.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();
  const {getButtonProps, buttonRef} = useButton({
    disabled: () => toValue(componentProps.disabled) ?? false,
    focusableWhenDisabled: () => toValue(componentProps.focusableWhenDisabled),
    native: () => toValue(componentProps.nativeButton) ?? true,
  });

  // useButton 的 buttonRef 同步到根元素（渲染提交后）——watch rootRef 转发
  watch(
    rootRef,
    (el) => {
      buttonRef(el as HTMLElement | null);
    },
    {flush: 'post', immediate: true},
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 渲染期逻辑（merged/state）在 IIFE 中执行（PD-15）
  return (
    <>
      {(() => {
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
