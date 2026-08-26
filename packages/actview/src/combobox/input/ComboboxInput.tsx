import { toRefs, unrefs, computed } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The input of the combobox. Renders an `<input>` element. */
export function ComboboxInput(componentProps: ComboboxInput.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, ref, ...elementProps} = toRefs(componentProps);
  const inputValue = computed(() => context.inputValueRef.value);
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');

  const inputRef = (el: any) => {
    context.store.setInputElement(el ?? null);
  };

  const {element} = useRenderElement({
    props: () => {
      const disabled = context.store.state.disabled;
      return [
        {
          type: 'text',
          role: 'combobox',
          'aria-expanded': open.value,
          'aria-haspopup': 'listbox',
          ...unrefs(elementProps),
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
        },
      ];
    },
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [inputRef, ref] : [inputRef]),
    defaultTag: 'input',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxInputProps {
  [key: string]: any;
}

export namespace ComboboxInput {
  export type Props = ComboboxInputProps;
}
