import { computed, ref, toRefs, unrefs, watch } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { EMPTY_ARRAY } from '@/utils/empty';
import type { BaseUIComponentProps, Orientation } from '@/internals/types';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
import { ToggleGroupContext } from './ToggleGroupContext';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { useToolbarRootContext } from '@/toolbar/root/ToolbarRootContext';
import { useToolbarGroupContext } from '@/toolbar/group/ToolbarGroupContext';

/**
 * Provides a shared state to a series of toggle buttons.
 *
 * Documentation: [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group)
 *
 * 裸函数组件写法（插件转换）：函数体 = setup（执行一次），最后 return JSX
 * 作为渲染模板。
 */
export function ToggleGroup<Value extends string>(props: ToggleGroup.Props<Value>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：toolbar 分支经 params.ref、CompositeRoot 分支经 refs 选项透传；
  // 用户 props.ref 经 watch 桥接（rootRef 提交后同步）。
  const rootRef = ref<HTMLElement | null>(null);
  watch(
    rootRef,
    (el) => {
      const userRef = (props as any).ref;
      if (typeof userRef === 'function') {
        userRef(el);
      } else if (userRef) {
        userRef.value = el;
      }
    },
    {flush: 'post', immediate: true},
  );

  const {
    className,
    render,
    style,
    defaultValue,
    value,
    disabled,
    loopFocus,
    multiple,
    onValueChange,
    orientation,
    ...elementProps
  } = toRefs(props);

  const toolbarContext = useToolbarRootContext(true);
  const toolbarGroupContext = useToolbarGroupContext();

  // 用 raw prop 区分"省略 value"与"空数组默认值"。
  const isValueInitialized = computed(
    () => value?.value !== undefined || defaultValue?.value !== undefined,
  );

  const disabledState = computed(
    () =>
      (toolbarContext?.disabled ?? false) ||
      (toolbarGroupContext?.disabled ?? false) ||
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
    const currentGroupValue = (groupValue.value ?? []).slice();
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

  // store-as-is 载体：身份稳定的 getter 对象（provide 只在 Provider setup 执行
  // 一次，computed 新对象会冻结快照）——字段渲染期求值，消费端读字段即追踪。
  const contextValue: ToggleGroupContext<Value> = {
    get disabled() {
      return disabledState.value;
    },
    setGroupValue,
    get value() {
      return groupValue.value ?? [];
    },
    get isValueInitialized() {
      return isValueInitialized.value;
    },
  };

  const defaultProps: HTMLProps = {role: 'group'};

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ToggleGroupContext.Provider value={contextValue}>
      {(() => {
        if (toolbarContext) {
          // Toolbar 内：直接渲染 group 元素（Toolbar.Group 包裹时无 CompositeRoot）
          return useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: stateValue.value,
              ref: useMergedRefs(rootRef, (props as any).ref),
              props: [defaultProps, unrefs(elementProps)],
            },
          );
        }

        return (
          <CompositeRoot
            render={render as any}
            className={className as any}
            style={style as any}
            state={stateValue.value as any}
            refs={[rootRef as any]}
            props={[defaultProps, unrefs(elementProps)]}
            stateAttributesMapping={toggleGroupStateAttributesMapping}
            loopFocus={loopFocus?.value ?? true}
            enableHomeAndEndKeys
            orientation={orientationState.value}
            refToRender
          >
            {props.children}
          </CompositeRoot>
        );
      })()}
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

const toggleGroupStateAttributesMapping: StateAttributesMapping<ToggleGroupState> = {
  disabled: (v) => (v ? {'data-disabled': ''} : null),
  multiple: (v) => (v ? {'data-multiple': ''} : null),
  orientation: (v) => ({'data-orientation': v}),
};
