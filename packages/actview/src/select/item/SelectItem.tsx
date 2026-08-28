import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { SelectItemContext } from './SelectItemContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** An individual select item. Renders a `<div>` element with role option. */
export function SelectItem(componentProps: SelectItem.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素；value/disabled 为组件自定义
  // props，单独持有（事件期读取实时值）。
  const store = useSelectRootContext(false);
  const { className, render, style, value, disabled, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  const selectedState = store.useState('isSelected', value?.value as any);
  const selected = computed(() => selectedState.value ?? false);

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：option 语义 + 选择逻辑 → 透传。
  const rootProps = computed<Record<string, any>>(() => ({
    role: 'option',
    'aria-selected': selected.value,
    'data-selected': selected.value ? '' : undefined,
    ...elementProps.value,
    onClick: (event: any) => {
      if (disabled?.value ?? false) {
        event.preventDefault();
        return;
      }
      store.selectValue(value?.value);
    },
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <SelectItemContext.Provider
      value={
        {
          selected: selected.value,
          value: value?.value,
        } as any
      }
    >
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
    </SelectItemContext.Provider>
  );
}

export interface SelectItemProps {
  /**
   * The value of the item.
   */
  value: any;
  /**
   * Whether the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace SelectItem {
  export type Props = SelectItemProps;
}
