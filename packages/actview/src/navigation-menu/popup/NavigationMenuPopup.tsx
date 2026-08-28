import { toRefs, unrefs, computed } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** Renders the popup when the menu is open. Renders a `<div>` element. */
export function NavigationMenuPopup(props: NavigationMenuPopup.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useNavigationMenuRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);
  const open = computed(() => context.openRef.value);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: any) => {
          context.setPopupElement(el ?? null);
        },
      ];
      if (props.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{!open.value ? null : element()}</>;
}

export interface NavigationMenuPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuPopup {
  export type Props = NavigationMenuPopupProps;
}
