import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * The corner of the scroll area, where the two scrollbars meet.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaCorner(componentProps: ScrollAreaCorner.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootContextRef = useScrollAreaRootContext();
  const cornerRef = useRootElementFragment();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {cornerSize} = rootContextRef.value;

      const merged: any = {
        ...unrefs(elementProps),
        style: {
          position: 'absolute',
          bottom: 0,
          insetInlineEnd: 0,
          width: cornerSize.width,
          height: cornerSize.height,
        },
      };
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value({}) : style?.value;
      if (resolvedStyle !== undefined) {
        merged.style = Object.assign({}, merged.style, resolvedStyle);
      }
      return [merged];
    },
    state: () => ({}),
    className,
    render,
    refs: () => [cornerRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const {hiddenState} = rootContextRef.value;
  return <>{hiddenState.corner ? null : element()}</>;
}

export interface ScrollAreaCornerState {}

export interface ScrollAreaCornerProps extends BaseUIComponentProps<'div', ScrollAreaCornerState> {}

export namespace ScrollAreaCorner {
  export type State = ScrollAreaCornerState;
  export type Props = ScrollAreaCornerProps;
}
