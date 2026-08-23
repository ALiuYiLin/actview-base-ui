import { defineComponent, toValue } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** The trigger of the combobox. Renders a `<button>` element. */
export const ComboboxTrigger = defineComponent(function ComboboxTrigger(
  componentProps: ComboboxTrigger.Props,
) {
  const context = useComboboxRootContext(false);
  const children = toValue(componentProps.children);
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;
    const disabled = context.store.state.disabled;

    const merged: any = {
      type: 'button',
      'aria-expanded': open.value,
      'aria-haspopup': 'listbox',
      ...elementProps,
      disabled,
      onClick: () => {
        if (!disabled) {
          context.store.toggleOpen();
        }
      },
    };

    const ref = (el: any) => {
      context.store.setTriggerElement(el ?? null);
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
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <button {...merged} ref={ref}>{children}</button>;
  };
});

export interface ComboboxTriggerProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxTrigger {
  export type Props = ComboboxTriggerProps;
}
