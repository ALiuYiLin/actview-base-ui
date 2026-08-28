import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The value of the select. Renders a `<span>` element. */
export function SelectValue(componentProps: SelectValue.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 为 render-prop（函数形式）→ 渲染期求值后注入 rootProps；
  // placeholder 为组件自定义 props，单独持有。
  const store = useSelectRootContext(false);
  const { className, render, style, placeholder, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  const valueState = store.useState('value');
  const value = computed(() => valueState.value);

  const hasValue = () => {
    const selectedValue = value.value;
    return selectedValue != null && String(selectedValue) !== '';
  };

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) {
      if (k === 'children') continue;
      out[k] = elementRefs[k].value;
    }
    return out;
  });

  // children 兼容 render prop + 缺省展示（渲染期求值）。
  const childrenOverride = computed(() => {
    const selectedValue = value.value;
    const child = elementRefs.children?.value;
    let display: any = child;
    if (typeof child === 'function') {
      display = child({value: selectedValue});
    } else if (display == null && hasValue()) {
      display = String(selectedValue);
    } else if (display == null) {
      display = placeholder?.value ?? '';
    }
    return display;
  });

  // 根元素 props：placeholder 语义 + children 注入 → 透传。
  const rootProps = computed<Record<string, any>>(() => ({
    ...elementProps.value,
    'data-placeholder': !hasValue() ? '' : undefined,
    children: childrenOverride.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'span',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          ref: componentProps.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface SelectValueProps {
  /**
   * The placeholder to display when no value is selected.
   */
  placeholder?: any;
  children?: any;
  [key: string]: any;
}

export namespace SelectValue {
  export type Props = SelectValueProps;
}
