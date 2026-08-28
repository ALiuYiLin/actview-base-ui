import { useRenderElement } from '@/internals/useRenderElement';

/** A separator between select items. Renders a `<div>` element. */
export function SelectSeparator(props: SelectSeparator.Props) {
  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 不解构、随 elementProps 流入渲染元素。
  return (
    <>
      {(() => {
        const {render, className, style, ...elementProps} = props as any;
        return useRenderElement(
          'div',
          {className, render, style},
          {
            ref: (props as any).ref,
            props: [elementProps],
          },
        );
      })()}
    </>
  );
}

export interface SelectSeparatorProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectSeparator {
  export type Props = SelectSeparatorProps;
}
