import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/** A link in the navigation menu. Renders an `<a>` element. */
export function NavigationMenuLink(componentProps: NavigationMenuLink.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const context = useNavigationMenuRootContext(true);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const rootProps = computed<Record<string, any>>(() => ({
    ...elementProps.value,
    href: elementProps.value.href ?? '#',
    onClick: () => {
      if (elementProps.value.value != null) {
        context?.setValue?.(elementProps.value.value);
      }
    },
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'a',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: {},
          ref: useMergedRefs(componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface NavigationMenuLinkProps {
  /**
   * The value of the item.
   */
  value?: any;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuLink {
  export type Props = NavigationMenuLinkProps;
}