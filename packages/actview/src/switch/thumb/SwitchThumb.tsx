import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSwitchRootContext } from '../root/SwitchRootContext';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';
import type { SwitchRootState } from '../root/SwitchRoot';

/**
 * Visualizes the "on" or "off" state of the switch.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export function SwitchThumb(componentProps: SwitchThumb.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useSwitchRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const stateValue = rootContextRef.value;
      const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);
      return [{...unrefs(elementProps), ...stateAttributes}];
    },
    state: () => rootContextRef.value,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface SwitchThumbProps extends BaseUIComponentProps<'span', SwitchThumbState> {}

export interface SwitchThumbState extends SwitchRootState {}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}
