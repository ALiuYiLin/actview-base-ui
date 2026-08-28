import { computed, ref, toValue, toRefs, unrefs, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { FieldsetRootContext, useFieldsetRootContext } from './FieldsetRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetRoot(componentProps: FieldsetRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<FieldsetRootContext.Provider>`），无 Fragment 根问题。
  const rootRef = useRootElement();

  const legendId = ref<string | undefined>(undefined);
  const setLegendId = (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => {
    legendId.value = typeof v === 'function' ? v(legendId.value) : v;
  };

  // context.use() 返回响应式 Ref：在 render/computed 里读 .value 建立追踪，
  // 父 fieldset disabled 变化时自动重算（不能在 setup 快照，否则嵌套不响应）。
  const parentFieldset = useFieldsetRootContext(true);
  const disabled = computed(
    () => parentFieldset?.disabled || (toValue((componentProps as any).disabled) ?? false),
  );

  const state = () => ({
    disabled: disabled.value,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [
      {'aria-labelledby': legendId.value, disabled: disabled.value},
      unrefs(elementProps),
    ],
    state,
    stateAttributesMapping: {},
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'fieldset',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // contextValue 必须在渲染期重建（每次新引用 + 最新 disabled.value）：
  // Provider 的 watch(() => props.value) 依赖引用变化，setup 固定引用时
  // 消费方永远读到初始值（嵌套 disabled 不响应）。
  return (
    <FieldsetRootContext.Provider
      value={
        {
          legendId: legendId.value,
          setLegendId,
          disabled: disabled.value,
        } as FieldsetRootContext
      }
    >
      {element()}
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
