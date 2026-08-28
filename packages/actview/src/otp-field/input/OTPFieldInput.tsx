import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import { useOTPFieldRootContext } from '../root/OTPFieldRootContext';
import { removeOTPCharacter, replaceOTPValue } from '../utils/otp';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
import { EMPTY_OBJECT } from '@/utils/empty';

/**
 * An individual OTP slot input.
 * Renders an `<input>` element.
 *
 * actview 简化：键盘导航（方向键移动/Enter 提交）仅实现 Backspace 与方向键基础移动。
 */
export function OTPFieldInput(componentProps: OTPFieldInput.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：getter 字段事件期属性访问实时。
  const context = useOTPFieldRootContext(false)!;

  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const index = computed(() => componentProps.index);

  const value = computed(() => (context.value ?? '')[index.value] ?? '');
  const hasFocus = computed(() => context.activeIndex === index.value);

  // 事件 handler：setup 闭包读 computed/context getter——事件触发时拿到实时值。
  const handleChange = (event: any) => {
    if (context.disabled || context.readOnly) {
      return;
    }
    const nextChar = (event.target.value ?? '').slice(-1);
    if (!nextChar) {
      return;
    }
    const nextValue = replaceOTPValue(
      context.value,
      index.value,
      nextChar,
      context.length,
      context.validationType,
    );
    context.setValue(nextValue);
    // 自动前进到下一格
    if (index.value < context.length - 1) {
      context.focusInput(index.value + 1);
    }
  };

  const handleKeyDown = (event: any) => {
    if (event.key === 'Backspace') {
      const currentChar = value.value;
      if (currentChar) {
        event.preventDefault();
        context.setValue(removeOTPCharacter(context.value, index.value));
      } else if (index.value > 0) {
        event.preventDefault();
        context.setValue(removeOTPCharacter(context.value, index.value - 1));
        context.focusInput(index.value - 1);
      }
    } else if (event.key === 'ArrowLeft' && index.value > 0) {
      event.preventDefault();
      context.focusInput(index.value - 1);
    } else if (event.key === 'ArrowRight' && index.value < context.length - 1) {
      event.preventDefault();
      context.focusInput(index.value + 1);
    }
  };

  const handleFocus = () => context.handleInputFocus(index.value);
  const handleBlur = () => context.handleInputBlur();

  // 值形 props toRefs 活引用；index 为组件自定义 prop（排除），children 不解构、
  // 随 elementRefs 流入渲染元素。
  const { className, render, style, index: _index, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const rootProps = computed<Record<string, any>>(() => ({
    type: context.mask ? 'password' : 'text',
    value: value.value,
    inputMode: context.inputMode,
    autoComplete: index.value === 0 ? (context.autoComplete ?? 'one-time-code') : 'off',
    'aria-label': `Character ${index.value + 1}`,
    'data-index': index.value,
    disabled: context.disabled,
    readOnly: context.readOnly,
    ...(hasFocus.value ? {'data-focused': ''} : EMPTY_OBJECT),
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,
    id: `${context.inputId}-${index.value + 1}`,
    ...elementProps.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'input',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          ref: componentProps.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface OTPFieldInputState {}

export interface OTPFieldInputProps extends BaseUIComponentProps<'input', OTPFieldInputState> {
  /**
   * The index of the input within the OTP field.
   */
  index: number;
  [key: string]: any;
}

export namespace OTPFieldInput {
  export type State = OTPFieldInputState;
  export type Props = OTPFieldInputProps;
}
