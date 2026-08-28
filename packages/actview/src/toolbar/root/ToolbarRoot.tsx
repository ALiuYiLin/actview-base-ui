import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import { ToolbarRootContext } from './ToolbarRootContext';

/**
 * A container for grouping a set of controls, such as buttons, toggle groups, or menus.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarRoot(componentProps: ToolbarRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);
  const loopFocus = computed(() => componentProps.loopFocus);
  const orientation = computed(() => componentProps.orientation ?? 'horizontal');

  const itemMap = ref(new Map<Node, CompositeMetadata<ToolbarRoot.ItemMetadata>>());
  const setItemMap = (m: Map<Node, CompositeMetadata<ToolbarRoot.ItemMetadata>>) => {
    itemMap.value = m;
  };

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

  // Only items that are disabled and not focusable when disabled
  // are removed from roving focus.
  const disabledIndices = computed<number[]>(() => {
    const indices: number[] = [];
    for (const itemMetadata of itemMap.value.values()) {
      if (itemMetadata.disabled && !itemMetadata.focusableWhenDisabled) {
        indices.push(itemMetadata.index);
      }
    }
    return indices;
  });

  const state = computed<ToolbarRootState>(() => ({
    disabled: disabled.value,
    orientation: orientation.value,
  }));

  const rootProps = computed<Record<string, any>>(() => ({
    'aria-orientation': orientation.value,
    role: 'toolbar',
  }));

  // store-as-is 载体：身份稳定的 getter 对象（provide 只在 Provider setup 执行
  // 一次，渲染期新对象会冻结快照）——disabled/orientation 渲染期求值。
  const contextValue: ToolbarRootContext = {
    get disabled() {
      return disabled.value;
    },
    get orientation() {
      return orientation.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ToolbarRootContext.Provider value={contextValue}>
      <CompositeRoot
        render={render as any}
        className={className as any}
        style={style as any}
        state={state.value as any}
        refs={[]}
        props={[rootProps.value, elementProps.value]}
        disabledIndices={disabledIndices.value}
        loopFocus={loopFocus.value}
        onMapChange={setItemMap}
        orientation={orientation.value}
      />
    </ToolbarRootContext.Provider>
  );
}

export interface ToolbarRootItemMetadata {
  disabled: boolean;
  focusableWhenDisabled: boolean;
}

export type ToolbarRootOrientation = 'horizontal' | 'vertical';

export interface ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * The component orientation.
   */
  orientation: ToolbarRoot.Orientation;
}

export interface ToolbarRootProps extends BaseUIComponentProps<'div', ToolbarRootState> {
  disabled?: boolean | undefined;
  /**
   * The orientation of the toolbar.
   * @default 'horizontal'
   */
  orientation?: ToolbarRoot.Orientation | undefined;
  /**
   * If `true`, using keyboard navigation will wrap focus to the other end of the toolbar once the end is reached.
   *
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export namespace ToolbarRoot {
  export type ItemMetadata = ToolbarRootItemMetadata;
  export type Orientation = ToolbarRootOrientation;
  export type State = ToolbarRootState;
  export type Props = ToolbarRootProps;
}
