import { toRefs, toValue, unrefs } from 'actview';
import type { BaseUIComponentProps, Orientation } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export function Separator(componentProps: Separator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = (): SeparatorState => ({
    orientation: toValue(componentProps.orientation) ?? 'horizontal',
  });

  const {element} = useRenderElement({
    // stateAttributes（无 mapping 走默认 data-{key} 分支）+ 静态 a11y 属性
    // 在 props getter 里手动合并。
    props: () => {
      const stateValue = stateFn();
      const stateAttributes = getStateAttributesProps(stateValue);
      const staticProps: Record<string, any> = {
        role: 'separator',
        'aria-orientation': stateValue.orientation,
      };
      return [staticProps, unrefs(elementProps), stateAttributes];
    },
    state: stateFn,
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

export interface SeparatorProps extends BaseUIComponentProps<'div', SeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}
