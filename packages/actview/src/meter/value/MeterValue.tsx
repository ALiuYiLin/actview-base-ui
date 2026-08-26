import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Displays the current value of the meter.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterValue(componentProps: MeterValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useMeterRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, children, style, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [
      {
        'aria-hidden': true,
      },
      unrefs(elementProps),
    ],
    state: () => ({}),
    className,
    style,
    render,
    refs: () => [rootRef as any],
    // children：render-prop（(formattedValue, value) => any）渲染期求值
    children: () => {
      const {value, formattedValue} = rootContextRef.value;
      const childrenValue = children?.value;
      return typeof childrenValue === 'function'
        ? (childrenValue as any)(formattedValue, value)
        : formattedValue;
    },
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface MeterValueState extends MeterRootState {}

export interface MeterValueProps extends Omit<BaseUIComponentProps<'span', MeterValueState>, 'children'> {
  children?: null | ((formattedValue: string, value: number) => any) | undefined;
}

export namespace MeterValue {
  export type State = MeterValueState;
  export type Props = MeterValueProps;
}
