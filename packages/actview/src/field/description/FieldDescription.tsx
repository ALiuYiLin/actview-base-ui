import { computed, defineComponent, onUnmounted, toValue, useRootElement, watch } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useFieldItemContext } from '../item/FieldItemContext';

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export const FieldDescription = defineComponent(function (componentProps: FieldDescription.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

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
  const latestRegisteredId = {current: undefined as string | undefined};
  watch(
    id,
    (idValue, _old, onCleanup) => {
      if (!idValue) {
        return;
      }
      latestRegisteredId.current = idValue;
      setMessageIds((v) => v.concat(idValue));
      onCleanup(() => {
        setMessageIds((v) => v.filter((item) => item !== idValue));
      });
    },
    {flush: 'post', immediate: true},
  );

  // 组件卸载时 watch 的 onCleanup 不保证执行——显式注销
  onUnmounted(() => {
    if (latestRegisteredId.current) {
      setMessageIds((v) => v.filter((item) => item !== latestRegisteredId.current));
    }
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const stateValue = state();
    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, {id: id.value}, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <p {...merged} ref={rootRef} />;
  };
}) as unknown as (props: FieldDescription.Props) => JSX.Element;

export interface FieldDescriptionState extends FieldRootState {}

export interface FieldDescriptionProps extends BaseUIComponentProps<'p', FieldDescriptionState> {}

export namespace FieldDescription {
  export type State = FieldDescriptionState;
  export type Props = FieldDescriptionProps;
}
