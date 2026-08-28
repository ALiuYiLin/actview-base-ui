import {computed, onUnmounted, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useFieldItemContext } from '../item/FieldItemContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldDescription(componentProps: FieldDescription.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  const generatedId = useBaseUiId();
  const id = computed(() => componentProps.id ?? generatedId);

  // context 载体直取（store-as-is）：字段渲染期 `.value` 求值即追踪。
  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const {setMessageIds} = useLabelableContext();

  const state = computed<FieldDescriptionState>(() => ({
    ...fieldRootContext.state.value,
    disabled: fieldRootContext.disabled.value || fieldItemContext.disabled.value,
  }));

  // React 版 useIsoLayoutEffect：id 注册进 messageIds，卸载时移除
  const latestRegisteredId = ref(undefined as string | undefined);
  watch(
    id,
    (idValue, _old, onCleanup) => {
      if (!idValue) {
        return;
      }
      latestRegisteredId.value = idValue;
      setMessageIds((v) => v.concat(idValue));
      onCleanup(() => {
        setMessageIds((v) => v.filter((item) => item !== idValue));
      });
    },
    {flush: 'post', immediate: true},
  );

  // 组件卸载时 watch 的 onCleanup 不保证执行——显式注销
  onUnmounted(() => {
    if (latestRegisteredId.value) {
      setMessageIds((v) => v.filter((item) => item !== latestRegisteredId.value));
    }
  });

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
    <>
      {useRenderElement(
        'p',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: fieldValidityMapping,
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: [{id: id.value}, elementProps.value],
        },
      )}
    </>
  );
}

export interface FieldDescriptionState extends FieldRootState {}

export interface FieldDescriptionProps extends BaseUIComponentProps<'p', FieldDescriptionState> {}

export namespace FieldDescription {
  export type State = FieldDescriptionState;
  export type Props = FieldDescriptionProps;
}
