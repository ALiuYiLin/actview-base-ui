import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** A label for the combobox. Renders a `<label>` element. */
export function ComboboxLabel(props: ComboboxLabel.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    children,
    defaultTag: 'label',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxLabelProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxLabel {
  export type Props = ComboboxLabelProps;
}
