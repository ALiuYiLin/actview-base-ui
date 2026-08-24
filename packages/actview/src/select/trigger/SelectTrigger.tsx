import { defineComponent, toValue, computed } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';

/** The trigger of the select. Renders a `<button>` element. */
export const SelectTrigger = defineComponent(function SelectTrigger(
  componentProps: SelectTrigger.Props,
) {
  const store = useSelectRootContext(false);
  const children = toValue(componentProps.children);
  const open = computed(() => store.useState('open').value);

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;
    const disabled = store.state.disabled ?? false;

    const merged: any = {
      type: 'button',
      ...elementProps,
      disabled,
      'aria-haspopup': 'listbox',
      'aria-expanded': open.value,
      onClick: () => {
        if (!disabled) {
          store.toggleOpen();
        }
      },
    };

    const ref = (el: any) => {
      store.setTriggerProps({ref: el as HTMLElement | null});
      if (componentProps.ref) {
        if (typeof componentProps.ref === 'function') (componentProps.ref as any)(el);
        else {
          (componentProps.ref as any).value = el;
          
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

export interface SelectTriggerProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectTrigger {
  export type Props = SelectTriggerProps;
}
