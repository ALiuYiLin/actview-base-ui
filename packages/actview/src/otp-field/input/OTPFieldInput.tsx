import { defineComponent, computed } from 'actview';
import { useOTPFieldRootContext } from '../root/OTPFieldRootContext';
import { removeOTPCharacter, replaceOTPValue } from '../utils/otp';
import type { BaseUIComponentProps } from '@/internals/types';

/**
 * An individual OTP slot input.
 * Renders an `<input>` element.
 *
 * actview 简化：键盘导航（方向键移动/Enter 提交）仅实现 Backspace 与方向键基础移动。
 */
export const OTPFieldInput = defineComponent(function OTPFieldInput(
  componentProps: OTPFieldInput.Props,
) {
  const {index} = componentProps as any;
  const context = useOTPFieldRootContext(false);

  const value = computed(() => (context.valueRef.value ?? '')[index] ?? '');
  const hasFocus = computed(() => context.activeIndexRef.value === index);

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

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
        index,
        nextChar,
        context.length,
        context.validationType,
      );
      context.setValue(nextValue);
      // 自动前进到下一格
      if (index < context.length - 1) {
        context.focusInput(index + 1);
      }
    };

    const handleKeyDown = (event: any) => {
      if (event.key === 'Backspace') {
        const currentChar = value.value;
        if (currentChar) {
          event.preventDefault();
          context.setValue(removeOTPCharacter(context.value, index));
        } else if (index > 0) {
          event.preventDefault();
          context.setValue(removeOTPCharacter(context.value, index - 1));
          context.focusInput(index - 1);
        }
      } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        context.focusInput(index - 1);
      } else if (event.key === 'ArrowRight' && index < context.length - 1) {
        event.preventDefault();
        context.focusInput(index + 1);
      }
    };

    const merged: any = {
      type: context.mask ? 'password' : 'text',
      value: value.value,
      inputMode: context.inputMode,
      autoComplete: index === 0 ? (context as any).autoComplete ?? 'one-time-code' : 'off',
      'aria-label': `Character ${index + 1}`,
      'data-index': index,
      disabled: context.disabled,
      readOnly: context.readOnly,
      ...elementProps,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onFocus: () => context.handleInputFocus(index),
      onBlur: () => context.handleInputBlur(),
      id: `${context.inputId}-${index + 1}`,
    };

    if (hasFocus.value) {
      merged['data-focused'] = '';
    }

    const ref = (el: any) => {
      if (componentProps.ref) {
        if (typeof componentProps.ref === 'function') (componentProps.ref as any)(el);
        else {
          (componentProps.ref as any).value = el;
          (componentProps.ref as any).current = el;
        }
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={ref} />;
    }

    return <input {...merged} ref={ref} />;
  };
});

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
