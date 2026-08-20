import { isHTMLElement } from '@floating-ui/utils/dom';
import { error } from '@base-ui/actview-utils/error';
import { computed, onMounted, onUpdated, ref, unref, useRootElement } from 'actview';
import type { Ref } from '@actview/core';
import { makeEventPreventable, mergeProps } from '../../merge-props';
import { useCompositeRootContext } from '../composite/root/CompositeRootContext';
import type { BaseUIEvent, HTMLProps, MaybeRef } from '../types';
import { useFocusableWhenDisabled } from '../../utils/useFocusableWhenDisabled';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';

// ============================================================
// useButton — ActView 版（Base UI useButton 移植）
//   setup 期调用一次；参数为 MaybeRef 对象（消费方传 computed，渲染期
//   unref 求值 → 读 props 代理 → 响应式）。
//   getButtonProps 渲染期调用（事件系统 invoker 复用不重绑，闭包每次最新）；
//   内部处理器经 mergeProps 链式合并（focusable → 内部 → 用户，Base UI 语义）。
// ============================================================
export function useButton(parameters: UseButtonParameters) {
  const elementRef = useRootElement()


  // composite 判定：compositeProp 优先，否则从 CompositeRoot 上下文推导
  // （React：const isCompositeItem = compositeProp ?? compositeRootContext !== undefined）
  const compositeRootContext = useCompositeRootContext(true)
  const isCompositeItem = computed(
    () => unref(parameters.composite) ?? compositeRootContext.value !== undefined,
  )

  // focusableWhenDisabled：渲染期 getter 产出 props（读 props 代理 → 响应式）
  const focusableWhenDisabled = useFocusableWhenDisabled({
    focusableWhenDisabled: parameters.focusableWhenDisabled,
    disabled: computed(() => unref(parameters.disabled) ?? false),
    composite: isCompositeItem,
    tabIndex: parameters.tabIndex,
    isNativeButton: computed(() => unref(parameters.native) ?? true),
  })

  // —— 挂载后：native 标签一致性警告（对齐 React useEffect，dev 环境）——
  onMounted(() => {
    const el = elementRef.value
    if (!el) return
    const isNativeButton = unref(parameters.native) ?? true
    const isButtonTag = isButtonElement(el)
    if (isNativeButton) {
      if (!isButtonTag) {
        error(
          'A component that acts as a button expected a native <button> because the ' +
            '`native` prop is true. Rendering a non-<button> removes native button ' +
            'semantics, which can impact forms and accessibility. Use a real <button> in ' +
            'the `render` prop, or set `native` to `false`.',
        )
      }
    } else if (isButtonTag) {
      error(
        'A component that acts as a button expected a non-<button> because the `native` ' +
          'prop is false. Rendering a <button> keeps native behavior while Base UI applies ' +
          'non-native attributes and handlers, which can add unintended extra attributes ' +
          '(such as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or ' +
          'set `native` to `true`.',
      )
    }
  })

  // —— disabled 穿透修复（composite 禁用按钮渲染另一个按钮时删 DOM disabled）——
  // focusable props 的 disabled 为 undefined（可聚焦禁用项不设原生 disabled）
  // 是穿透判断的依据（对齐 React updateDisabled）
  const updateDisabled = () => {
    const el = elementRef.value
    if (!isButtonElement(el)) return
    const disabled = unref(parameters.disabled) ?? false
    const fwdProps = focusableWhenDisabled.props()
    if (isCompositeItem.value && disabled && fwdProps.disabled === undefined && el.disabled) {
      el.disabled = false
    }
  }
  onMounted(updateDisabled)
  onUpdated(updateDisabled)

  // —— getButtonProps：渲染期调用，闭包读最新参数 ——
  const getButtonProps = (externalProps: GenericButtonProps = {}) => {
    const disabled = unref(parameters.disabled) ?? false
    const isNativeButton = unref(parameters.native) ?? true
    const isCompositeItemValue = isCompositeItem.value

    const {
      onClick: externalOnClick,
      onMouseDown: externalOnMouseDown,
      onKeyUp: externalOnKeyUp,
      onKeyDown: externalOnKeyDown,
      onPointerDown: externalOnPointerDown,
      ...otherExternalProps
    } = externalProps

    const focusableProps = focusableWhenDisabled.props()

    return mergeProps(
      {
        onClick(event: MouseEvent) {
          if (disabled) {
            event.preventDefault();
            return;
          }
          externalOnClick?.(event);
        },
        onMouseDown(event: MouseEvent) {
          if (!disabled) {
            externalOnMouseDown?.(event);
          }
        },
        onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
          if (disabled) {
            return;
          }

          makeEventPreventable(event);
          externalOnKeyDown?.(event);
          if (event.baseUIHandlerPrevented) {
            return;
          }

          const isCurrentTarget = event.target === event.currentTarget;
          const currentTarget = event.currentTarget as Element;
          const isButton = isButtonElement(currentTarget);
          const isLink = !isNativeButton && isValidLinkElement(currentTarget);
          const shouldClick = isCurrentTarget && (isNativeButton ? isButton : !isLink);
          const isEnterKey = event.key === 'Enter';
          const isSpaceKey = event.key === ' ';
          const role = currentTarget.getAttribute('role');
          const isTextNavigationRole =
            role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';

          // composite 项 Space：keydown 激活（阻止滚动 + 派发 click）
          if (isCurrentTarget && isCompositeItemValue && isSpaceKey) {
            if (event.defaultPrevented && isTextNavigationRole) {
              return;
            }
            event.preventDefault();
            // 仅原生模式且不是真实 <button> 的元素被排除（点击由浏览器默认处理）
            if (!isNativeButton || isButton) {
              event.preventBaseUIHandler();
              dispatchClickWithModifiers(currentTarget, event);
            }
            return;
          }

          // 键盘可访问性（原生/非原生元素）
          if (!shouldClick || isNativeButton || (!isSpaceKey && !isEnterKey)) {
            // Space 激活链接（`role="button"` 语义，匹配 composite 路径）；
            // 阻止页面滚动（否则 Space 会触发滚动）
            if (isCurrentTarget && isLink && isSpaceKey) {
              event.preventDefault();
            }
            return;
          }

          // 对齐原生按钮：keydown 默认行为被阻止 → 取消激活
          if (event.defaultPrevented) {
            return;
          }
          event.preventDefault();
          if (isEnterKey) {
            event.preventBaseUIHandler();
            dispatchClickWithModifiers(currentTarget, event);
          }
        },
        onKeyUp(event: BaseUIEvent<KeyboardEvent>) {
          if (disabled) {
            return;
          }

          makeEventPreventable(event);
          externalOnKeyUp?.(event);

          // Space 在原生 <button> 的 keyup 上 preventDefault 会阻止 click 派发
          if (
            event.target === event.currentTarget &&
            isNativeButton &&
            isCompositeItemValue &&
            isButtonElement(event.currentTarget as HTMLElement) &&
            event.key === ' '
          ) {
            event.preventDefault();
            return;
          }
          if (event.baseUIHandlerPrevented) {
            return;
          }

          // 非交互元素的键盘激活（非原生、非 composite）：
          // 对齐原生按钮——keyup preventDefault 取消 Space 激活（keydown 无法取消，
          // 因为 keydown/keyup 之间不保留状态）
          if (
            event.target === event.currentTarget &&
            !isNativeButton &&
            !isCompositeItemValue &&
            !event.defaultPrevented &&
            event.key === ' '
          ) {
            event.preventBaseUIHandler();
            dispatchClickWithModifiers(event.currentTarget as Element, event);
          }
        },
        onPointerDown(event: PointerEvent) {
          if (disabled) {
            event.preventDefault();
            return;
          }
          externalOnPointerDown?.(event);
        },
      },
      isNativeButton ? { type: 'button' } : { role: 'button' },
      focusableProps,
      otherExternalProps,
    ) as HTMLProps
  }

  return {
    getButtonProps,
    buttonRef: elementRef,
  }
}

function isButtonElement(elem: Element | null): elem is HTMLButtonElement {
  return isHTMLElement(elem) && elem.tagName === 'BUTTON';
}

function isValidLinkElement(elem: Element | null): elem is HTMLAnchorElement {
  return isHTMLElement(elem) && elem.tagName === 'A' && Boolean((elem as HTMLAnchorElement).href);
}

interface GenericButtonProps extends Omit<HTMLProps, 'onClick'>, AdditionalButtonProps {
  onClick?: ((event: MouseEvent) => void) | undefined;
}

interface AdditionalButtonProps extends Partial<{
  'aria-disabled': boolean;
  disabled: boolean;
  role: string;
  tabIndex?: number | undefined;
}> {}

export interface UseButtonParameters {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: MaybeRef<boolean> | undefined;
  /**
   * Whether the button may receive focus even if it is disabled.
   * @default false
   */
  focusableWhenDisabled?: MaybeRef<boolean | undefined> | undefined;
  tabIndex?: MaybeRef<number | undefined> | undefined;
  /**
   * Whether the component is being rendered as a native button.
   * @default true
   */
  native?: MaybeRef<boolean> | undefined;
  /**
   * Whether the button is part of a composite widget.
   * When `true`, keyboard activation for Space occurs on keydown rather than keyup.
   * @default inferred from CompositeRoot context
   */
  composite?: MaybeRef<boolean | undefined> | undefined;
}

export interface UseButtonReturnValue {
  /**
   * Resolver for the button props.
   * @param externalProps additional props for the button
   * @returns props that should be spread on the button
   */
  getButtonProps: (externalProps?: HTMLProps) => HTMLProps;
  /**
   * 模板 ref（ref={buttonRef}）——指向按钮根 DOM。
   * 由使用方合并进 useRenderElement 的 ref 数组（[componentProps.ref, buttonRef]）。
   */
  buttonRef: Ref<HTMLElement | null>;
}

export interface UseButtonState {}
