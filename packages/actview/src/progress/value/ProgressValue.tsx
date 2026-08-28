import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import type { ProgressRootState } from '../root/ProgressRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Displays the current value of the progress bar.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressValue(componentProps: ProgressValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useProgressRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, children, style, ...elementProps} = toRefs(componentProps);

  const stateFn = () => rootContextRef.value.state;

  const {element} = useRenderElement({
    props: () => [
      {
        'aria-hidden': true,
      },
      unrefs(elementProps),
    ],
    state: stateFn,
    stateAttributesMapping: progressStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    // children：render-prop（(formattedValue, value) => any）渲染期求值
    children: () => {
      const {value, formattedValue, state} = rootContextRef.value;

      // Follow `status` rather than re-deriving it: a non-finite `value` is also indeterminate, and
      // has no formatted text to show.
      const indeterminate = state.status === 'indeterminate';
      const formattedValueArg = indeterminate ? 'indeterminate' : formattedValue;
      const formattedValueDisplay = indeterminate ? null : formattedValue;

      const childrenValue = children?.value;
      return typeof childrenValue === 'function'
        ? (childrenValue as any)(formattedValueArg, value)
        : formattedValueDisplay;
    },
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ProgressValueState extends ProgressRootState {}

export interface ProgressValueProps
  extends Omit<BaseUIComponentProps<'span', ProgressValueState>, 'children'> {
  children?:
    | null
    | ((formattedValue: string | null, value: number | null) => any)
    | undefined;
}

export namespace ProgressValue {
  export type State = ProgressValueState;
  export type Props = ProgressValueProps;
}
