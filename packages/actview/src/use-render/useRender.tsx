/**
 * Renders a Base UI element, converting `state` values into `data-*` attributes.
 *
 * actview 版：与 React 版语义一致——`useRender` 在组件 setup 中调用，
 * 返回一个渲染函数（读取渲染期 state 值后返回元素）。
 *
 * @public
 */
export function useRender<State extends Record<string, any>>(
  params: useRender.Parameters<State>,
): () => any {
  const {
    render,
    props: elementProps = {},
    state: stateGetter,
    stateAttributesMapping,
    ref,
    defaultTagName = 'div',
  } = params as any;

  return () => {
    const stateValue = typeof stateGetter === 'function' ? stateGetter() : (stateGetter ?? {});

    // state → data-* 属性（react 版 getStateAttributesProps 语义）
    const dataAttributes: Record<string, string> = {};
    for (const key in stateValue) {
      const value = stateValue[key];
      if (customMappingHas(stateAttributesMapping, key)) {
        const customProps = stateAttributesMapping[key](value);
        if (customProps != null) {
          Object.assign(dataAttributes, customProps);
        }
        continue;
      }
      if (value === true) {
        dataAttributes[`data-${key.toLowerCase()}`] = '';
      } else if (value) {
        dataAttributes[`data-${key.toLowerCase()}`] = value.toString();
      }
    }

    // props 覆盖 state 属性
    const mergedProps = {...dataAttributes, ...elementProps};

    const mergedRefs = (el: any) => {
      const refs = Array.isArray(ref) ? ref : ref ? [ref] : [];
      for (const r of refs) {
        if (!r) continue;
        if (typeof r === 'function') {
          r(el);
        } else {
          r.value = el;
        }
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...mergedProps, ref: mergedRefs} as any, stateValue);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, mergedProps, restRenderProps);
      mergedRenderProps.className =
        typeof mergedProps.className === 'string' && typeof renderClassName === 'string'
          ? `${mergedProps.className} ${renderClassName}`.trim()
          : (mergedProps.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, mergedProps.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs} />;
    }

    const Tag = defaultTagName as any;
    return <Tag {...mergedProps} ref={mergedRefs} />;
  };
}

function customMappingHas(mapping: any, key: string) {
  return mapping != null && Object.prototype.hasOwnProperty.call(mapping, key);
}

export namespace useRender {
  export interface Parameters<State extends Record<string, any>> {
    /**
     * The React element or a function that returns one to override the default element.
     */
    render?: any;
    /**
     * Props to apply to the element.
     */
    props?: Record<string, any> | undefined;
    /**
     * State values converted to `data-*` attributes.
     */
    state?: State | (() => State) | undefined;
    /**
     * Custom mapping from state keys to attributes.
     */
    stateAttributesMapping?:
      | Record<string, (value: any) => Record<string, any> | null | undefined>
      | undefined;
    /**
     * Refs to attach to the element.
     */
    ref?: any;
    /**
     * The default element type to render.
     * @default 'div'
     */
    defaultTagName?: any;
    [key: string]: any;
  }

  export type ReturnValue = () => any;
}

export type ComponentRenderFn<Props, State> = (props: Props, state: State) => any;
