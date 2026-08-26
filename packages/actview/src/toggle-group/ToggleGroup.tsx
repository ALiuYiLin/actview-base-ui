import { computed, toRefs, toValue, unrefs } from 'actview';
import type { ComputedRef } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { EMPTY_ARRAY } from '@/utils/empty';
import type { BaseUIComponentProps, HTMLProps, Orientation } from '@/internals/types';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { ToggleGroupContext } from './ToggleGroupContext';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { useToolbarRootContext } from '@/toolbar/root/ToolbarRootContext';
import { useToolbarGroupContext } from '@/toolbar/group/ToolbarGroupContext';

/**
 * Provides a shared state to a series of toggle buttons.
 *
 * Documentation: [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group)
 *
 * 裸函数组件写法（插件转换）：函数体 = setup（执行一次），最后 return JSX
 * 作为渲染模板——JSX 里 refs 自动解包（solid 风格编译）。
 */
export function ToggleGroup<Value extends string>(props: ToggleGroup.Props<Value>) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {
    className,
    render,
    style,
    children,
    defaultValue,
    value,
    disabled,
    loopFocus,
    multiple,
    onValueChange,
    orientation,
    ...elementProps
  } = toRefs(props);

  const toolbarContextRef = useToolbarRootContext(true);
  const toolbarGroupContextRef = useToolbarGroupContext();

  // 用 raw prop 区分"省略 value"与"空数组默认值"。
  const isValueInitialized = computed(
    () => value?.value !== undefined || defaultValue?.value !== undefined,
  );

  const disabledState = computed(
    () =>
      (toolbarContextRef.value?.disabled ?? false) ||
      (toolbarGroupContextRef.value?.disabled ?? false) ||
      (disabled?.value ?? false),
  );

  const multipleState = computed(() => multiple?.value ?? false);
  const orientationState = computed(() => orientation?.value ?? 'horizontal');

  const [groupValue, setValueState] = useControlled({
    controlled: () => value?.value,
    default: computed(() => defaultValue?.value ?? EMPTY_ARRAY),
    name: 'ToggleGroup',
    state: 'value',
  });

  const setGroupValue = (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<typeof REASONS.none>,
  ) => {
    const currentGroupValue = (toValue(groupValue) ?? []).slice();
    let newGroupValue: Value[];
    if (multipleState.value) {
      newGroupValue = currentGroupValue.slice();
      if (nextPressed) {
        newGroupValue.push(newValue);
      } else {
        newGroupValue.splice(currentGroupValue.indexOf(newValue), 1);
      }
    } else {
      newGroupValue = nextPressed ? [newValue] : [];
    }

    onValueChange?.value?.(newGroupValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueState(newGroupValue);
  };

  const stateValue = computed<ToggleGroupState>(() => ({
    disabled: disabledState.value,
    multiple: multipleState.value,
    orientation: orientationState.value,
  }));

  const contextValue = computed<ToggleGroupContext<Value>>(() => ({
    disabled: disabledState.value,
    setGroupValue,
    value: groupValue as unknown as ComputedRef<readonly Value[]>,
    isValueInitialized: isValueInitialized.value,
  }));

  const stateAttributes = computed(() =>
    getStateAttributesProps(stateValue.value, toggleGroupStateAttributesMapping),
  );

  const defaultProps: HTMLProps = {role: 'group'};

  // 合并 + 渲染统一工具（含 className/style 函数形式、render prop 分支）。
  const {merged, element: toolbarElement} = useRenderElement({
    props: () => [defaultProps, unrefs(elementProps)],
    state: stateValue,
    stateAttributesMapping: toggleGroupStateAttributesMapping,
    className,
    style,
    render,
    children,
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ToggleGroupContext.Provider value={contextValue.value}>
      {toolbarContextRef.value ? (
        toolbarElement()
      ) : (
        <CompositeRoot
          render={undefined}
          state={stateValue.value}
          refs={[]}
          props={[
            defaultProps,
            unrefs(elementProps),
            stateAttributes.value,
            {className: merged().className, style: merged().style},
          ]}
          loopFocus={loopFocus?.value ?? true}
          enableHomeAndEndKeys
          orientation={orientationState.value}
        >
          {children?.value}
        </CompositeRoot>
      )}
    </ToggleGroupContext.Provider>
  );
}

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

export interface ToggleGroupProps<Value extends string>
  extends BaseUIComponentProps<'div', ToggleGroupState> {
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

const nullMapping = () => null;

const toggleGroupStateAttributesMapping: StateAttributesMapping<ToggleGroupState> = {
  disabled: nullMapping,
  multiple: nullMapping,
  orientation: nullMapping,
};
