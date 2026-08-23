import { computed, defineComponent, toValue } from 'actview';
import type { ComputedRef } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { EMPTY_ARRAY } from '@/utils/empty';
import type { BaseUIComponentProps, HTMLProps, Orientation } from '@/internals/types';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
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
 */
export const ToggleGroup = defineComponent(function <Value extends string>(
  componentProps: ToggleGroup.Props<Value>,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const defaultValueProp = toValue(componentProps.defaultValue);
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const loopFocus = toValue(componentProps.loopFocus) ?? true;
  const onValueChange = componentProps.onValueChange;
  const orientation = toValue(componentProps.orientation) ?? 'horizontal';
  const multiple = toValue(componentProps.multiple) ?? false;
  const valueProp = toValue(componentProps.value);

  const defaultValue = defaultValueProp ?? EMPTY_ARRAY;
  // Use the raw prop to distinguish an omitted value from the empty default.
  const isValueInitialized = valueProp !== undefined || defaultValueProp !== undefined;

  const toolbarContextRef = useToolbarRootContext(true);
  const toolbarGroupContextRef = useToolbarGroupContext();

  const disabled =
    (toolbarContextRef.value?.disabled ?? false) ||
    (toolbarGroupContextRef.value?.disabled ?? false) ||
    disabledProp;

  const [groupValue, setValueState] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: 'ToggleGroup',
    state: 'value',
  });

  const setGroupValue = (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<typeof REASONS.none>,
  ) => {
    const currentGroupValue = toValue(groupValue) as Value[];
    let newGroupValue: Value[];
    if (multiple) {
      newGroupValue = currentGroupValue.slice();
      if (nextPressed) {
        newGroupValue.push(newValue);
      } else {
        newGroupValue.splice(currentGroupValue.indexOf(newValue), 1);
      }
    } else {
      newGroupValue = nextPressed ? [newValue] : [];
    }

    onValueChange?.(newGroupValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueState(newGroupValue);
  };

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const stateValue: ToggleGroupState = {disabled, multiple, orientation};

    const contextValue: ToggleGroupContext<Value> = {
      disabled,
      setGroupValue,
      value: groupValue as ComputedRef<readonly Value[]>,
      isValueInitialized,
    };

    const stateAttributes = getStateAttributesProps(
      stateValue,
      toggleGroupStateAttributesMapping,
    );

    const defaultProps: HTMLProps = {
      role: 'group',
    };

    const merged: HTMLProps = {};
    Object.assign(merged, defaultProps, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    const element = (refs?: Array<((el: HTMLElement | null) => void) | {current: HTMLElement | null}>) => {
      if (render) {
        if (typeof render === 'function') {
          return render({...merged, ...stateValue, ref: refs?.[0]} as any);
        }
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        return <Tag key={render.key} {...mergedRenderProps} ref={refs?.[0]} />;
      }
      return <div {...merged}>{componentProps.children}</div>;
    };

    const toolbarContext = toolbarContextRef.value;

    return (
      <ToggleGroupContext.Provider value={contextValue as any}>
        {toolbarContext ? (
          element()
        ) : (
          <CompositeRoot
            render={undefined}
            className={undefined}
            style={undefined}
            state={stateValue}
            refs={[]}
            props={[defaultProps, elementProps, stateAttributes]}
            loopFocus={loopFocus}
            enableHomeAndEndKeys
            orientation={orientation}
          >
            {componentProps.children}
          </CompositeRoot>
        )}
      </ToggleGroupContext.Provider>
    );
  };
}) as unknown as <Value extends string>(
  props: ToggleGroup.Props<Value>,
) => JSX.Element;

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
