import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { FieldItemContext } from './FieldItemContext';
import { LabelableProvider } from '@/internals/labelable-provider';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldItem(componentProps: FieldItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：字段渲染期 `.value` 求值即追踪。
  const {state: fieldState, disabled: rootDisabled} = useFieldRootContext(false);

  // disabled 用 computed（Root 的 disabled 或本组件 disabled 动态变化时实时更新）
  const disabled = computed(() => rootDisabled.value || (componentProps.disabled ?? false));

  const state = computed<FieldItemState>(() => ({...fieldState.value, disabled: disabled.value}));

  // store-as-is 载体：身份稳定（setup 构建一次），ComputedRef 字段渲染期求值。
  const itemContextValue = {disabled};

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

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <LabelableProvider>
      <FieldItemContext.Provider value={itemContextValue}>
        {useRenderElement(
          'div',
          {
            className: className?.value,
            render: render?.value,
            style: style?.value,
          },
          {
            state: state.value,
            stateAttributesMapping: fieldValidityMapping,
            ref: useMergedRefs(rootRef, componentProps.ref as any),
            props: elementProps.value,
          },
        )}
      </FieldItemContext.Provider>
    </LabelableProvider>
  );
}

export interface FieldItemState extends FieldRootState {}

export interface FieldItemProps extends BaseUIComponentProps<'div', FieldItemState> {
  /**
   * Whether the wrapped control should ignore user interaction.
   * The `disabled` prop on `<Field.Root>` takes precedence over this.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace FieldItem {
  export type State = FieldItemState;
  export type Props = FieldItemProps;
}
