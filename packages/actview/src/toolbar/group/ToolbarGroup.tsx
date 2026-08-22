import { computed, defineComponent, ref } from 'actview';
import { type BaseUIComponentProps, type HTMLProps } from '@/internals/types';
import { useToolbarRootContext } from '@/toolbar/root/ToolbarRootContext';
import type { ToolbarRootState } from '@/toolbar/root/ToolbarRoot';
import { ToolbarGroupContext } from '@/toolbar/group/ToolbarGroupContext';
import { mergePropsN } from '@/merge-props';

/**
 * Groups several toolbar items or toggles.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export const ToolbarGroup = defineComponent(function (componentProps: ToolbarGroup.Props) {
  // ================= setup（只执行一次） =================
  // context hooks 必须在 setup 顶层（AD-42），渲染期读 .value 建立响应式
  const rootContext = useToolbarRootContext();

  const disabled = computed(
    () => (rootContext.value.disabled ?? false) || (componentProps.disabled ?? false),
  );

  // context 值：computed 惰性缓存——依赖不变时引用稳定（对照 ToggleGroup）
  const contextValue = computed<ToolbarGroupContext>(() => ({
    disabled: disabled.value,
  }));

  // 根 ref：组件根 VNode 是 Provider 包裹（div 在内层），useRootElement 拿不到
  // 实际元素 → ref() + 显式挂载（对照 CompositeRoot 的边界处理，react-migration.md 案例 6）
  const rootRef = ref<HTMLElement | null>(null);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      className,
      disabled: _disabled, // setup computed 已接管
      render,
      style,
      ref: _ref, // 用户 ref：根是 Provider 包裹，由内部 rootRef 绑定 DOM
      ...elementProps
    } = componentProps;

    const state: ToolbarGroupState = {
      disabled: disabled.value,
      orientation: rootContext.value.orientation,
    };

    const defaultProps: HTMLProps = { role: 'group' };

    const merged = mergePropsN([
      defaultProps,
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ]);

    // render 三形态。Provider 必须始终包裹渲染结果：
    // ToolbarGroup 的职责就是向内部 items 提供 group context（disabled）
    if (typeof render === 'function') {
      return (
        <ToolbarGroupContext.Provider value={contextValue.value}>
          {render({ ...merged, ...state, ref: rootRef })}
        </ToolbarGroupContext.Provider>
      );
    }
    if (render) {
      const Tag = render.type as any;
      return (
        <ToolbarGroupContext.Provider value={contextValue.value}>
          <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />
        </ToolbarGroupContext.Provider>
      );
    }
    return (
      <ToolbarGroupContext.Provider value={contextValue.value}>
        <div ref={rootRef} {...merged} />
      </ToolbarGroupContext.Provider>
    );
  };
}) as (props: ToolbarGroup.Props) => any;

export interface ToolbarGroupState extends ToolbarRootState {}

export interface ToolbarGroupProps extends BaseUIComponentProps<'div', ToolbarGroupState> {
  /**
   * When `true` all toolbar items in the group are disabled.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ToolbarGroup {
  export type State = ToolbarGroupState;
  export type Props = ToolbarGroupProps;
}
