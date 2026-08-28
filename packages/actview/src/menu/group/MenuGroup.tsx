import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import { MenuGroupContext, type MenuGroupContextValue } from './MenuGroupContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 */
export function MenuGroup(componentProps: MenuGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const labelId = ref<string | undefined>(undefined);

  const setLabelId: MenuGroupContextValue = (value) => {
    labelId.value =
      typeof value === 'function'
        ? (value as any)(labelId.value)
        : value;
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const rootProps = computed<Record<string, any>>(() => ({
    role: 'group',
    'aria-labelledby': labelId.value,
    ...elementProps.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenuGroupContext.Provider value={setLabelId}>
      {useRenderElement(
        'div',
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
    </MenuGroupContext.Provider>
  );
}

export interface MenuGroupProps {
  /**
   * The content of the component.
   */
  children?: any;
  [key: string]: any;
}

export interface MenuGroupState {}

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuGroupState;
}
