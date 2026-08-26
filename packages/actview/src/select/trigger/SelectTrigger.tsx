import { toRefs, unrefs, computed } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The trigger of the select. Renders a `<button>` element. */
export function SelectTrigger(componentProps: SelectTrigger.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useSelectRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const openState = store.useState('open');
  const open = computed(() => openState.value);

  const {element} = useRenderElement({
    props: () => {
      const disabled = store.state.disabled ?? false;
      return [
        {
          type: 'button',
          ...unrefs(elementProps),
          disabled,
          'aria-haspopup': 'listbox',
          'aria-expanded': open.value,
          onClick: () => {
            if (!disabled) {
              store.toggleOpen();
            }
          },
        },
      ];
    },
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: any) => {
          store.setTriggerProps({ref: el as HTMLElement | null});
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface SelectTriggerProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectTrigger {
  export type Props = SelectTriggerProps;
}
