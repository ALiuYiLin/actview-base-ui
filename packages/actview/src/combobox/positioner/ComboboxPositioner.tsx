import { toRefs, unrefs } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Positions the popup. Renders a `<div>` element. actview 简化：无定位计算。 */
export function ComboboxPositioner(props: ComboboxPositioner.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, children, ref, ...elementProps} = toRefs(props);

  const positionerRef = (el: any) => {
    context.store.setPositionerElement(el ?? null);
  };

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => (props.ref !== undefined ? [positionerRef, ref] : [positionerRef]),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxPositioner {
  export type Props = ComboboxPositionerProps;
}
