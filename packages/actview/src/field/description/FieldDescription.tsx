import { useRootElementFragment } from '@/internals/useRootElementFragment';
import {computed, onUnmounted, toValue, watch, ref, toRefs, unrefs} from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useFieldItemContext } from '../item/FieldItemContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldDescription(componentProps: FieldDescription.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElementFragment();

  const generatedId = useBaseUiId();
  const id = computed(() => toValue(componentProps.id) ?? generatedId);

  const fieldRootContext = toValue(useFieldRootContext(false));
  const fieldItemContext = toValue(useFieldItemContext());
  const {setMessageIds} = toValue(useLabelableContext());

  const state = () => ({
    ...fieldRootContext.state.value,
    disabled: fieldRootContext.disabled.value || fieldItemContext.disabled,
  });

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

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{id: id.value}, unrefs(elementProps)],
    state,
    stateAttributesMapping: fieldValidityMapping,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'p',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface FieldDescriptionState extends FieldRootState {}

export interface FieldDescriptionProps extends BaseUIComponentProps<'p', FieldDescriptionState> {}

export namespace FieldDescription {
  export type State = FieldDescriptionState;
  export type Props = FieldDescriptionProps;
}
