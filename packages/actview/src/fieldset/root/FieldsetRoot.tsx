import { computed, defineComponent, ref } from 'actview';
import { FieldsetRootContext, useFieldsetRootContext } from './FieldsetRootContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { mergePropsN } from '../../merge-props';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export const FieldsetRoot = defineComponent(function (componentProps: FieldsetRoot.Props) {
  // ================= setup（只执行一次） =================
  const labelId = ref<string | undefined>(undefined);
  const setLabelId = (id: string | undefined) => {
    labelId.value = id;
  };

  // 父级 fieldset 的 disabled（可嵌套；官方 context 的 use() 必须在 setup 顶层，AD-42）
  const parentContext = useFieldsetRootContext(true);

  // disabled：父级优先合并本组件 prop（React 语义 parentDisabled || disabledProp）
  const disabled = computed(
    () => (parentContext.value?.disabled ?? false) || (componentProps.disabled ?? false),
  );

  // context 值：computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo，
  // 也保证 Provider watch 只在派生值真正变化时同步）
  const contextValue = computed<FieldsetRootContext>(() => ({
    legendId: labelId.value,
    setLegendId: setLabelId,
    disabled: disabled.value,
  }));

  // 根 ref：组件根 VNode 是 Provider 包裹（fieldset 在内层），useRootElement 拿不到
  // 实际元素 → ref() + 显式挂载（对照 MeterRoot/CompositeRoot 边界，案例 6）
  const rootRef = ref<HTMLElement | null>(null);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      disabled: _disabled, // setup computed 已接管
      style,
      ref: _ref, // 用户 ref：根是 Provider 包裹，由内部 rootRef 绑定 DOM
      ...elementProps
    } = componentProps;

    const state: FieldsetRootState = {
      disabled: disabled.value,
    };

    // state → data-* 属性（默认映射：disabled=true → data-disabled=""）
    const stateAttributes = getStateAttributesProps(state);

    const defaultProps: HTMLProps = {
      'aria-labelledby': labelId.value,
      disabled: disabled.value,
    };

    const merged = mergePropsN([
      defaultProps,
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ]);

    // render 三形态 + Provider 包裹（Provider 必须始终包裹：向子件提供 disabled/legendId）
    if (typeof render === 'function') {
      return (
        <FieldsetRootContext.Provider value={contextValue.value}>
          {render({ ...merged, ...state, ref: rootRef })}
        </FieldsetRootContext.Provider>
      );
    }
    if (render) {
      const Tag = render.type as any;
      return (
        <FieldsetRootContext.Provider value={contextValue.value}>
          <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />
        </FieldsetRootContext.Provider>
      );
    }
    return (
      <FieldsetRootContext.Provider value={contextValue.value}>
        <fieldset ref={rootRef} {...merged} />
      </FieldsetRootContext.Provider>
    );
  };
}) as (props: FieldsetRoot.Props) => any;

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetRootProps extends BaseUIComponentProps<'fieldset', FieldsetRootState> {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled?: boolean | undefined;
}

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
  export type Props = FieldsetRootProps;
}
