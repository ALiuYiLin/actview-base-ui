import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import type { ProgressRootState } from '../root/ProgressRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * A label for the progress bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressLabel(componentProps: ProgressLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useProgressRootContext();

  // useLabel 必须在 setup 调用（useRegisteredLabelId 含 watch/computed/
  // onUnmounted——渲染期调用会每次渲染累积副作用）。
  // setLabelId 是 Root 的稳定函数（setup 定义一次），setup 快照安全。
  const {setLabelId} = rootContextRef.value;
  const labelProps = useLabel({
    setLabelId: setLabelId as any,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = () => rootContextRef.value.state;

  const {element} = useRenderElement({
    props: () => {
      const elementPropsWithoutId = {...unrefs(elementProps)} as any;
      delete elementPropsWithoutId.id;

      return [labelProps, elementPropsWithoutId];
    },
    state: stateFn,
    stateAttributesMapping: progressStateAttributesMapping as any,
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

export interface ProgressLabelState extends ProgressRootState {}

export interface ProgressLabelProps
  extends Omit<BaseUIComponentProps<'div', ProgressLabelState>, 'id'> {}

export namespace ProgressLabel {
  export type State = ProgressLabelState;
  export type Props = ProgressLabelProps;
}
