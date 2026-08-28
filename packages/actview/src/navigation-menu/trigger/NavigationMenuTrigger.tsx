import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A trigger for the navigation menu.
 * Renders a `<button>` element.
 *
 * actview 简化：hover/点击均切换 open（鼠标进入与按下）；键盘导航未接线
 * （floating-ui actview 层 useListNavigation 已完整移植）。
 */
export function NavigationMenuTrigger(componentProps: NavigationMenuTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const context = useNavigationMenuRootContext(false)!;

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

  // 事件 handler：setup 闭包读 context getter——事件触发时拿到实时值。
  const rootProps = computed<Record<string, any>>(() => ({
    type: 'button',
    ...elementProps.value,
    'data-active': context.valueRef.value === elementProps.value.value ? '' : undefined,
    onClick: () => {
      if (!context.disabled) {
        if (elementProps.value.value != null) {
          context.setValue(context.valueRef.value === elementProps.value.value ? null : elementProps.value.value);
        }
      }
    },
    onMouseEnter: () => {
      if (!context.disabled && elementProps.value.value != null) {
        context.setValue(elementProps.value.value);
      }
    },
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'button',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          ref: componentProps.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface NavigationMenuTriggerProps {
  /**
   * The value of the item this trigger opens.
   */
  value?: any;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuTrigger {
  export type Props = NavigationMenuTriggerProps;
}