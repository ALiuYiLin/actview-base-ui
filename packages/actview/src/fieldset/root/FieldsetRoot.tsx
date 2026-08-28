import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { FieldsetRootContext, useFieldsetRootContext } from './FieldsetRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetRoot(componentProps: FieldsetRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElement）。
  const rootRef = ref(null as HTMLElement | null);

  const legendId = ref<string | undefined>(undefined);
  const setLegendId = (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => {
    legendId.value = typeof v === 'function' ? v(legendId.value) : v;
  };

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪，
  // 嵌套 fieldset 的父级 disabled 变化时自动重算。
  const parentFieldset = useFieldsetRootContext(true);
  const disabled = computed(
    () => parentFieldset?.disabled || (componentProps.disabled ?? false),
  );

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

  const state = computed<FieldsetRootState>(() => ({
    disabled: disabled.value,
  }));

  const rootProps = computed<Record<string, any>>(() => ({
    'aria-labelledby': legendId.value,
    disabled: disabled.value,
  }));

  // store-as-is 载体：身份稳定的 getter 对象（provide 只在 Provider setup 执行
  // 一次，渲染期新对象会冻结快照）——legendId/disabled 渲染期求值。
  const contextValue: FieldsetRootContext = {
    get legendId() {
      return legendId.value;
    },
    setLegendId,
    get disabled() {
      return disabled.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <FieldsetRootContext.Provider value={contextValue}>
      {useRenderElement(
        'fieldset',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: {},
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: [rootProps.value, elementProps.value],
        },
      )}
    </FieldsetRootContext.Provider>
  );
}

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetRootProps extends BaseUIComponentProps<'fieldset', FieldsetRootState> {
  /**
   * Whether to disable all the fields inside the fieldset.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
  export type Props = FieldsetRootProps;
}
