import { toRefs, unrefs } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** The popup of the combobox. Renders a `<div>` element when open. */
export function ComboboxPopup(props: ComboboxPopup.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, children, ref, ...elementProps} = toRefs(props);
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');
  const mounted = context.store.useState('mounted');

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => (props.ref !== undefined ? [ref] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{!open.value && !mounted.value ? null : element()}</>;
}

export interface ComboboxPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxPopup {
  export type Props = ComboboxPopupProps;
}
