import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Groups the interactive parts of the number field.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldGroup(componentProps: NumberFieldGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useNumberFieldRootContext();
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{role: 'group'}, {...unrefs(elementProps)}],
    state: () => rootContextRef.value.state,
    stateAttributesMapping: stateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface NumberFieldGroupState extends NumberFieldRootState {}

export interface NumberFieldGroupProps extends BaseUIComponentProps<'div', NumberFieldGroupState> {}

export namespace NumberFieldGroup {
  export type State = NumberFieldGroupState;
  export type Props = NumberFieldGroupProps;
}
