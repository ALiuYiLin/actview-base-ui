import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { ToolbarRoot } from '../root/ToolbarRoot';

/**
 * A link component.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarLink(componentProps: ToolbarLink.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useToolbarRootContext();

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

  const state = computed<ToolbarLinkState>(() => ({
    orientation: rootContext.orientation,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CompositeItem
      tag="a"
      render={render as any}
      className={className as any}
      style={style as any}
      metadata={TOOLBAR_LINK_METADATA as any}
      state={state.value as any}
      refs={[]}
      props={[elementProps.value]}
    />
  );
}

const TOOLBAR_LINK_METADATA = {disabled: false, focusableWhenDisabled: false};

export interface ToolbarLinkState {
  /**
   * The component orientation.
   */
  orientation: ToolbarRoot.Orientation;
}

export interface ToolbarLinkProps extends BaseUIComponentProps<'a', ToolbarLinkState> {}

export namespace ToolbarLink {
  export type State = ToolbarLinkState;
  export type Props = ToolbarLinkProps;
}
