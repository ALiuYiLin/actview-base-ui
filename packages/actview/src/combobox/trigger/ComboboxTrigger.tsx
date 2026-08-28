import { toRefs, unrefs } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** The trigger of the combobox. Renders a `<button>` element. */
export function ComboboxTrigger(componentProps: ComboboxTrigger.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, children, ref, ...elementProps} = toRefs(componentProps);
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');

  const triggerRef = (el: any) => {
    context.store.setTriggerElement(el ?? null);
  };

  const {element} = useRenderElement({
    props: () => {
      const disabled = context.store.state.disabled;
      return [
        {
          type: 'button',
          'aria-expanded': open.value,
          'aria-haspopup': 'listbox',
          ...unrefs(elementProps),
          disabled,
          onClick: () => {
            if (!disabled) {
              context.store.toggleOpen();
            }
          },
        },
      ];
    },
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [triggerRef, ref] : [triggerRef]),
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxTriggerProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxTrigger {
  export type Props = ComboboxTriggerProps;
}
