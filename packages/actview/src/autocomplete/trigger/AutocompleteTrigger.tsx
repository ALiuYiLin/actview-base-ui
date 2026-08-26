import { useAutocompleteRootContext } from '../root/AutocompleteRootContext';

/** The trigger of the autocomplete. Renders a `<button>` element. */
export function AutocompleteTrigger(componentProps: AutocompleteTrigger.Props) {
  const context = useAutocompleteRootContext(false);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {(() => {
        const {render, children, ...elementProps} = componentProps as any;
        const disabled = context.store.state.disabled;

        const merged: any = {
          type: 'button',
          'aria-haspopup': 'listbox',
          'aria-expanded': context.store.state.open,
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
      })()}
    </>
  );
}

export interface AutocompleteTriggerProps {
  children?: any;
  [key: string]: any;
}

export namespace AutocompleteTrigger {
  export type Props = AutocompleteTriggerProps;
}
