import { computed, defineComponent, ref, useRootElement, watch } from 'actview';
import { error } from '@base-ui/actview-utils/error';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useToggleGroupContext } from '@/toggle-group/ToggleGroupContext';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import {
  type BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useButton } from '@/internals/use-button/useButton';
import { mergePropsN } from '@/merge-props';


/**
 * A two-state button that can be on or off.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export const Toggle = defineComponent(function (componentProps: Toggle.Props) {
  // ================= setup（只执行一次） =================
  // 组件根 DOM（subTree.el 统一解：根是元素/组件都拿到 DOM）
  const rootRef = useRootElement()

  // group 上下文：createContext 的 use() 必须在 setup 顶层（AD-42），
  // 渲染期读 .value 建立响应式追踪
  const groupContext = useToggleGroupContext<any>()


  // 受控状态（useControlled 等价，等下深入）：
  // 初始值取 defaultPressed——React 语义：default 仅首次生效，后续变化忽略
  const pressedState = ref(componentProps.defaultPressed ?? false)


  // setup 顶层：生成一次兜底 id（稳定）
  const fallbackId = useBaseUiId()

  // disabled / nativeButton：props 依赖提升为 setup 的 computed——
  // 渲染期求值（读 props 代理 → 响应式），useButton 收 MaybeRef 对象
  const disabled = computed(() => (componentProps.disabled || groupContext.value?.disabled) ?? false)
  const nativeButton = computed(() => componentProps.nativeButton ?? true)

  // dev 警告（对齐 React 的 NODE_ENV 检查；watch 等价 useEffect deps；
  // 条件用 groupContext.value——groupContext 是 Ref，恒非 null）
  if (process.env.NODE_ENV !== 'production') {
    watch(
      () => [groupContext.value?.isValueInitialized, componentProps.value],
      () => {
        if (
          groupContext.value &&
          componentProps.value === undefined &&
          groupContext.value.isValueInitialized
        ) {
          error(
            'A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop.',
            'This will cause issues between the Toggle Group and Toggle values.',
            'Provide the `<Toggle>` with a `value` prop matching the `<ToggleGroup>` values prop type.',
          )
        }
      },
      { immediate: true },
    )
  }

  // useButton：MaybeRef 对象参数（computed 渲染期求值 → 响应式）；
  // composite 不传——useButton 内部从 CompositeRoot context 推导（isCompositeItem）
  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  })

  // ================= render（每次更新执行） =================
  return () => {
    const {
      className,
      defaultPressed: _defaultPressed,
      disabled: _disabled, // 排除（setup computed 已接管）
      form: _form, // 不参与表单校验
      nativeButton: _nativeButton, // 排除（setup computed 已接管）
      onPressedChange,
      pressed: pressedProp,
      render,
      type: _type, // button type 不可变（原生 button 默认 type 由 useButton 补）
      value: valueProp,
      style,
      ...elementProps
    } = componentProps

    // value：override 优先（"" → 兜底 id），否则 setup 生成的稳定 id
    const value = componentProps.value || fallbackId

    // B5 修正：groupContext 是 Ref（恒非 null），取上下文对象必须读 .value
    const group = groupContext.value // ToggleGroupContext<Value> | undefined
    const groupValue = group?.value ?? []

    // 受控判定（等下深入 useControlled）：group/受控 prop 优先于本地状态
    const pressed = group
      ? value !== undefined && groupValue.indexOf(value) > -1
      : (pressedProp ?? pressedState.value)

    const state = { disabled: disabled.value, pressed }

    // 属性合并（onClick 渲染期重建闭包——事件系统 invoker 复用不重绑）
    const props = [
      {
        'aria-pressed': pressed,
        onClick(event: any) {
          const nextPressed = !pressed
          const details = createChangeEventDetails(REASONS.none, event) // 等下深入
          onPressedChange?.(nextPressed, details)
          if (details.isCanceled) return
          if (value) groupContext.value?.setGroupValue?.(value, nextPressed, details)
          if (details.isCanceled) return
          pressedState.value = nextPressed // 非受控写本地；受控由外部驱动
        },
      },
      elementProps,
      getButtonProps(),
    ]

    // itemMetadata（useMemo 等价：渲染期对象，disabled 变化即新对象）
    const itemMetadata = { disabled: disabled.value, focusableWhenDisabled: false }

    // mergeProps（等下深入：className/style 求值 + 事件链式合并）
    const merged = mergePropsN([props, { className, style }])


    // B6 修正：groupContext 是 Ref，判定必须读 .value。
    // CompositeItem 提供 roving focus / 键盘导航（group 场景必需）；
    // 显式泛型让 className 函数形态与 ToggleState 精确匹配——
    // 框架层 LibraryManagedAttributes 已修复（不再产生 fn & string）
    if (group) {
      return (
        <CompositeItem
          tag="button"
          render={render}
          className={className}
          style={style}
          metadata={itemMetadata}
          state={state}
          props={props}
        />
      )
    }

    // useRenderElement 等价（两形态 + 默认 button）
    if (typeof render === 'function') {
      // C9 修正：项目 ComponentRenderFn 是双参 (props, state)——不能单对象合并
      return render({ ...merged, ref: rootRef, ...state})
    }
    if (render) {
      const Tag = render.type as any
      return <Tag key={render.key} {...render.props} {...merged} />
    }
    return <button {...merged} />
  }
})

export interface ToggleState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export interface ToggleProps<Value extends string>
  extends NativeButtonProps, BaseUIComponentProps<'button', ToggleState> {
  /**
   * Whether the toggle button is currently pressed.
   * This is the controlled counterpart of `defaultPressed`.
   */
  pressed?: boolean | undefined;
  /**
   * Whether the toggle button is currently pressed.
   * This is the uncontrolled counterpart of `pressed`.
   * @default false
   */
  defaultPressed?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the pressed state is changed.
   */
  onPressedChange?:
    | ((pressed: boolean, eventDetails: Toggle.ChangeEventDetails) => void)
    | undefined;
  /**
   * A unique string that identifies the toggle when used
   * inside a toggle group.
   */
  value?: Value | undefined;
}

export type ToggleChangeEventReason = typeof REASONS.none;

export type ToggleChangeEventDetails = BaseUIChangeEventDetails<Toggle.ChangeEventReason>;

export namespace Toggle {
  export type State = ToggleState;
  export type Props<TValue extends string = string> = ToggleProps<TValue>;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}
