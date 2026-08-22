import { computed, defineComponent, useRootElement } from 'actview';
import { type FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { FieldItemContext } from '@/field/item/FieldItemContext';
import { LabelableProvider } from '@/internals/labelable-provider';
import { mergePropsN } from '@/merge-props';

/**
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export const FieldItem = defineComponent(function (componentProps: FieldItem.Props) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42）；未重构家族自封装 context 的 use()
  // 返回 ref 形态，读 .value 一致
  const fieldRootContext = useFieldRootContext(false);

  // 组件根 DOM：根是元素（div），useRootElement 自动绑定（案例 6）
  const rootRef = useRootElement();

  const state = computed<FieldItemState>(() => ({
    ...fieldRootContext.value.state,
    disabled: (fieldRootContext.value.disabled ?? false) || (componentProps.disabled ?? false),
  }));

  const fieldItemContext = computed<FieldItemContext>(() => ({
    disabled: state.value.disabled,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      disabled: _disabled, // setup state 已接管
      style,
      ref: _ref, // 用户 ref：根是元素，useRootElement 自动绑定
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    // state → data-* 属性（fieldValidityMapping：valid → data-valid/data-invalid）
    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态 + Provider 包裹（LabelableProvider + FieldItemContext 必须始终
    // 包裹：向子件提供 labelable/disabled 上下文）
    if (typeof render === 'function') {
      return (
        <LabelableProvider>
          <FieldItemContext.Provider value={fieldItemContext}>
            {render({ ...merged, ...stateValue, ref: rootRef })}
          </FieldItemContext.Provider>
        </LabelableProvider>
      );
    }
    if (render) {
      const Tag = render.type as any;
      return (
        <LabelableProvider>
          <FieldItemContext.Provider value={fieldItemContext}>
            <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />
          </FieldItemContext.Provider>
        </LabelableProvider>
      );
    }
    return (
      <LabelableProvider>
        <FieldItemContext.Provider value={fieldItemContext}>
          <div ref={rootRef} {...merged} />
        </FieldItemContext.Provider>
      </LabelableProvider>
    );
  };
}) as (props: FieldItem.Props) => any;

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
