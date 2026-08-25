import { computed, defineComponent, ref, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { FieldsetRootContext, useFieldsetRootContext } from './FieldsetRootContext';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export const FieldsetRoot = defineComponent(function (componentProps: FieldsetRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
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
    () => parentFieldset.value?.disabled || (toValue((componentProps as any).disabled) ?? false),
  );

  const state = () => ({
    disabled: disabled.value,
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;
    // contextValue 必须在 render 内重建（每次新引用 + 最新 disabled.value）：
    // Provider 的 watch(() => props.value) 依赖引用变化，setup 固定引用时
    // 消费方永远读到初始值（嵌套 disabled 不响应）。
    const contextValue: FieldsetRootContext = {
      legendId: legendId.value,
      setLegendId,
      disabled: disabled.value,
    };

    const stateValue = state();
    const stateAttributes = getStateAttributesProps(stateValue, {});

    const merged: HTMLProps = {};
    Object.assign(merged, {'aria-labelledby': legendId.value, disabled: disabled.value}, elementProps, stateAttributes);
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

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue, ref: rootRef});
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <fieldset {...merged} ref={rootRef} />;
    }

    return <FieldsetRootContext.Provider value={contextValue}>{element}</FieldsetRootContext.Provider>;
  };
}) as unknown as (props: FieldsetRoot.Props) => JSX.Element;

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetRootProps extends BaseUIComponentProps<'fieldset', FieldsetRootState> {}

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
  export type Props = FieldsetRootProps;
}
