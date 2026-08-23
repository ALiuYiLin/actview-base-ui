import { defineComponent, computed } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** The input of the combobox. Renders an `<input>` element. */
export const ComboboxInput = defineComponent(function ComboboxInput(
  componentProps: ComboboxInput.Props,
) {
  const context = useComboboxRootContext(false);
  const inputValue = computed(() => context.inputValueRef.value);
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;
    const disabled = context.store.state.disabled;

    const merged: any = {
      type: 'text',
      role: 'combobox',
      'aria-expanded': open.value,
      'aria-haspopup': 'listbox',
      ...elementProps,
      value: inputValue.value,
      disabled,
      onChange: (event: any) => {
        if (!disabled) {
          context.setInputValue(event.target.value ?? '');
        }
      },
      onFocus: () => {
        if (!disabled && context.store.state.items) {
          context.store.open();
        }
      },
    };

    const ref = (el: any) => {
      context.store.setInputElement(el ?? null);
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
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref} />;
    }
    return <input {...merged} ref={ref} />;
  };
});

export interface ComboboxInputProps {
  [key: string]: any;
}

export namespace ComboboxInput {
  export type Props = ComboboxInputProps;
}
