import { computed, defineComponent, ref } from 'actview';
import { EMPTY_ARRAY } from '@base-ui/actview-utils/empty';
import type { BaseUIComponentProps, Orientation } from '../internals/types';
import { CompositeRoot } from '../internals/composite/root/CompositeRoot';
import { useToolbarRootContext } from '../toolbar/root/ToolbarRootContext';
import { useToolbarGroupContext } from '../toolbar/group/ToolbarGroupContext';
import { ToggleGroupContext } from './ToggleGroupContext';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';
import { mergePropsN } from '../merge-props';

/**
 * Provides a shared state to a series of toggle buttons.
 *
 * Documentation: [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group)
 */
export const ToggleGroup = defineComponent(function <Value extends string>(
  componentProps: ToggleGroup.Props<Value>,
) {
  // ================= setup（只执行一次） =================
  // context hooks 必须在 setup 顶层（AD-42），渲染期读 .value 建立响应式
  const toolbarContext = useToolbarRootContext(true);
  const toolbarGroupContext = useToolbarGroupContext();

  // 受控状态（useControlled 等价）：初始值取 defaultValue——
  // React 语义：default 仅首次生效，后续变化忽略
  const isControlled = computed(() => componentProps.value !== undefined);
  const valueState = ref<readonly Value[]>(componentProps.defaultValue ?? EMPTY_ARRAY);

  const groupValue = computed<readonly Value[]>(() =>
    isControlled.value && componentProps.value !== undefined
      ? componentProps.value
      : valueState.value,
  );

  // 用原始 prop 区分"未传"与"显式空数组默认值"
  const isValueInitialized = computed(
    () => componentProps.value !== undefined || componentProps.defaultValue !== undefined,
  );

  const disabled = computed<boolean>(
    () =>
      (toolbarContext.value?.disabled ?? false) ||
      (toolbarGroupContext.value?.disabled ?? false) ||
      componentProps.disabled ||
      false,
  );

  // 事件回调 setup 定义：函数体内读 componentProps 代理 + groupValue.value，
  // 事件触发时都是最新值（setup 不解构 → 无快照冻结）
  const setGroupValue = (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<typeof REASONS.none>,
  ) => {
    const current = groupValue.value ?? EMPTY_ARRAY;
    let newGroupValue: Value[];
    if (componentProps.multiple ?? false) {
      newGroupValue = current.slice();
      if (nextPressed) {
        newGroupValue.push(newValue);
      } else {
        newGroupValue.splice(current.indexOf(newValue), 1);
      }
    } else {
      newGroupValue = nextPressed ? [newValue] : [];
    }

    componentProps.onValueChange?.(newGroupValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    if (!isControlled.value) {
      valueState.value = newGroupValue;
    }
  };

  // context 值：computed 惰性缓存——依赖不变时引用稳定，
  // Provider 的 watch 只在真正变化时同步（不产生无谓的消费方重渲染）
  const contextValue = computed<ToggleGroupContext<Value>>(() => ({
    disabled: disabled.value,
    setGroupValue,
    value: groupValue.value ?? EMPTY_ARRAY,
    isValueInitialized: isValueInitialized.value,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const {
      defaultValue: _defaultValue,
      disabled: _disabled, // setup computed 已接管
      loopFocus,
      onValueChange: _onValueChange,
      orientation,
      multiple: _multiple,
      value: _value,
      className,
      render,
      style,
      ...elementProps
    } = componentProps;

    const state: ToggleGroupState = {
      disabled: disabled.value,
      multiple: componentProps.multiple ?? false,
      orientation: orientation ?? 'horizontal',
    };

    const defaultProps = { role: 'group' };

    // toolbar 分支：Toolbar 自己已是 CompositeRoot，这里直接渲染元素
    if (toolbarContext.value) {
      const merged = mergePropsN([
        defaultProps,
        elementProps,
        {
          className: typeof className === 'function' ? className(state) : className,
          style: typeof style === 'function' ? style(state) : style,
        },
      ]);

      if (typeof render === 'function') {
        return render({ ...merged, ...state });
      }
      if (render) {
        const Tag = render.type as any;
        return <Tag key={render.key} {...render.props} {...merged} />;
      }
      return <div {...merged} />;
    }

    // 非 toolbar 分支：CompositeRoot 提供 roving focus / 键盘导航
    return (
      <ToggleGroupContext.Provider value={contextValue.value}>
        <CompositeRoot
          render={render}
          className={className}
          style={style}
          state={state}
          props={[defaultProps, elementProps]}
          loopFocus={loopFocus ?? true}
          enableHomeAndEndKeys
          orientation={orientation ?? 'horizontal'}
        />
      </ToggleGroupContext.Provider>
    );
  };
}) as <Value extends string>(
  props: ToggleGroup.Props<Value>,
) => any;

export interface ToggleGroupState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * When `false` only one item in the group can be pressed. If any item in
   * the group becomes pressed, the others will become unpressed.
   * When `true` multiple items can be pressed.
   * @default false
   */
  multiple: boolean;
  /**
   * The orientation of the toggle group.
   */
  orientation: Orientation;
}

export interface ToggleGroupProps<Value extends string> extends BaseUIComponentProps<
  'div',
  ToggleGroupState
> {
  /**
   * The pressed state of the toggle group represented by an array of
   * the values of all pressed toggle buttons.
   * This is the controlled counterpart of `defaultValue`.
   */
  value?: readonly Value[] | undefined;
  /**
   * The pressed state of the toggle group represented by an array of
   * the values of all pressed toggle buttons.
   * This is the uncontrolled counterpart of `value`.
   */
  defaultValue?: readonly Value[] | undefined;
  /**
   * Callback fired when the pressed states of the toggle group changes.
   */
  onValueChange?:
    | ((groupValue: Value[], eventDetails: ToggleGroup.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the toggle group should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * When `false` only one item in the group can be pressed. If any item in
   * the group becomes pressed, the others will become unpressed.
   * When `true` multiple items can be pressed.
   * @default false
   */
  multiple?: boolean | undefined;
}

export type ToggleGroupChangeEventReason = typeof REASONS.none;

export type ToggleGroupChangeEventDetails = BaseUIChangeEventDetails<ToggleGroup.ChangeEventReason>;

export namespace ToggleGroup {
  export type State = ToggleGroupState;
  export type Props<Value extends string = string> = ToggleGroupProps<Value>;
  export type ChangeEventReason = ToggleGroupChangeEventReason;
  export type ChangeEventDetails = ToggleGroupChangeEventDetails;
}
