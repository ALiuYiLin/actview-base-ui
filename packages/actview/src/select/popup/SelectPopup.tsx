import { toRefs, unrefs, computed } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The popup of the select. Renders a `<div>` element when open. */
export function SelectPopup(props: SelectPopup.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useSelectRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);
  const openState = store.useState('open');
  const mountedState = store.useState('mounted');
  const open = computed(() => openState.value);
  const mounted = computed(() => mountedState.value);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => (props.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{!open.value && !mounted.value ? null : element()}</>;
}

export interface SelectPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectPopup {
  export type Props = SelectPopupProps;
}
