import { useRootElementFragment } from '@/internals/useRootElementFragment';
import { toValue, toRefs, unrefs, computed } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { FieldItemContext } from './FieldItemContext';
import { LabelableProvider } from '@/internals/labelable-provider';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldItem(componentProps: FieldItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElementFragment();

  const {state: fieldState, disabled: rootDisabled} = toValue(useFieldRootContext(false));

  const disabledProp = toValue(componentProps.disabled) ?? false;

  // disabled 用 computed（Root 的 disabled 或本组件 disabled 动态变化时实时更新）
  const disabled = computed(() => rootDisabled.value || disabledProp);

  const state = () => ({...fieldState.value, disabled: disabled.value});

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state,
    stateAttributesMapping: fieldValidityMapping,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <LabelableProvider>
      {/* disabled 为 computed ref——消费方读 `.value` 保持实时（同 LabelableProvider 的 refs 模式） */}
      <FieldItemContext.Provider value={{disabled}}>
        {element()}
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
