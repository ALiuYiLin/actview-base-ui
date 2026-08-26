import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** Removes a chip. Renders a `<button>` element. actview 简化：无回调（由用户 onClick 处理）。 */
export function ComboboxChipRemove(props: ComboboxChipRemove.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [
      {
        type: 'button',
        'aria-label': 'Remove',
        ...unrefs(elementProps),
      },
    ],
    className,
    style,
    render,
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxChipRemoveProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxChipRemove {
  export type Props = ComboboxChipRemoveProps;
}
