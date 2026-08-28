import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Contains the meter indicator.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterTrack(componentProps: MeterTrack.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  // 消费 context 以保持存在性检查（React 版 useRenderElement 无 state）
  const rootContextRef = useMeterRootContext();
  void rootContextRef;

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: () => ({}),
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

export interface MeterTrackState extends MeterRootState {}

export interface MeterTrackProps extends BaseUIComponentProps<'div', MeterTrackState> {}

export namespace MeterTrack {
  export type State = MeterTrackState;
  export type Props = MeterTrackProps;
}
