import { toRefs, unrefs, ref } from 'actview';
import { MenuGroupContext, type MenuGroupContextValue } from './MenuGroupContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 */
export function MenuGroup(componentProps: MenuGroup.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(componentProps);

  const labelId = ref<string | undefined>(undefined);

  const setLabelId: MenuGroupContextValue = (value) => {
    labelId.value =
      typeof value === 'function'
        ? (value as any)(labelId.value)
        : value;
  };

  const {element} = useRenderElement({
    props: () => [
      {
        role: 'group',
        'aria-labelledby': labelId.value,
      },
      unrefs(elementProps),
    ],
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <MenuGroupContext.Provider value={setLabelId}>{element()}</MenuGroupContext.Provider>;
}

export interface MenuGroupProps {
  /**
   * The content of the component.
   */
  children?: any;
  [key: string]: any;
}

export interface MenuGroupState {}

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuGroupState;
}
