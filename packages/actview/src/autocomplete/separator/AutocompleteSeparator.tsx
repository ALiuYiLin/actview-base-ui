/** A separator between autocomplete items. Renders a `<div>` element. */
export function AutocompleteSeparator(props: AutocompleteSeparator.Props) {
  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {(() => {
        const {render, children, ...elementProps} = props as any;
        const merged: any = {...elementProps};
        if (render) {
          if (typeof render === 'function') return render({...merged} as any);
          const Tag = render.type as any;
          return <Tag {...render.props} {...merged} />;
        }
        return <div {...merged}>{children}</div>;
      })()}
    </>
  );
}

export interface AutocompleteSeparatorProps {
  children?: any;
  [key: string]: any;
}

export namespace AutocompleteSeparator {
  export type Props = AutocompleteSeparatorProps;
}
