import { computed } from 'actview';
import type { ComputedRef } from '@actview/core';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { EMPTY_ARRAY } from '@base-ui/actview-utils/empty';
import { useRenderElement } from '../internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps, Orientation } from '../internals/types';
import { CompositeRoot } from '../internals/composite/root/CompositeRoot';
import { useToolbarRootContext } from '../toolbar/root/ToolbarRootContext';
import { useToolbarGroupContext } from '../toolbar/group/ToolbarGroupContext';
import { ToggleGroupContext } from './ToggleGroupContext';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';

/**
 * Provides a shared state to a series of toggle buttons.
 *
 * Documentation: [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group)
 */
export function ToggleGroup<Value extends string>(props: ToggleGroup.Props<Value>) {
  const toolbarContext = useToolbarRootContext(true);
  const toolbarGroupContext = useToolbarGroupContext();

  const isValueInitialized = computed(
    () => props.value !== undefined || props.defaultValue !== undefined,
  );

  const disabled = computed<boolean>(
    () =>
      (toolbarContext.value?.disabled ?? false) ||
      (toolbarGroupContext.value?.disabled ?? false) ||
      props.disabled ||
      false,
  );

  const groupValue = useControlled<readonly Value[]>({
    controlled: () => props.value,
    default: () => props.defaultValue ?? EMPTY_ARRAY,
    name: 'ToggleGroup',
    state: 'value',
  });

  const setGroupValue = (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<typeof REASONS.none>,
  ) => {
    const current = groupValue.value ?? EMPTY_ARRAY;
    let newGroupValue: Value[];
    if (props.multiple ?? false) {
      newGroupValue = current.slice();
      if (nextPressed) {
        newGroupValue.push(newValue);
      } else {
        newGroupValue.splice(current.indexOf(newValue), 1);
      }
    } else {
      newGroupValue = nextPressed ? [newValue] : [];
    }

    props.onValueChange?.(newGroupValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    groupValue.setValueIfUncontrolled(newGroupValue);
  };

  const state = computed<ToggleGroupState>(() => ({
    disabled: disabled.value,
    multiple: props.multiple ?? false,
    orientation: props.orientation ?? 'horizontal',
  }));

  const contextValue = computed<ToggleGroupContext<Value>>(() => ({
    disabled: disabled.value,
    setGroupValue,
    value: groupValue.value ?? EMPTY_ARRAY,
    isValueInitialized: isValueInitialized.value,
  }));

  const getElementProps = () => {
    const {
      defaultValue: _defaultValue,
      disabled: _disabled,
      loopFocus: _loopFocus,
      onValueChange: _onValueChange,
      orientation: _orientation,
      multiple: _multiple,
      value: _value,
      className: _className,
      render: _render,
      style: _style,
      ref: _ref,
      ...elementProps
    } = props;
    return elementProps;
  };

  const getElement = useRenderElement('div', props, {
    enabled: Boolean(toolbarContext.value),
    state,
    ref: props.ref,
    props: [{ role: 'group' }, getElementProps],
  });

  return (
    <ToggleGroupContext.Provider value={contextValue}>
      {toolbarContext.value ? (
        getElement()
      ) : (
        <CompositeRoot
          render={props.render}
          className={props.className}
          style={props.style}
          state={state.value}
          refs={[props.ref]}
          props={[{ role: 'group' }, getElementProps]}
          loopFocus={props.loopFocus ?? true}
          enableHomeAndEndKeys
          orientation={props.orientation ?? 'horizontal'}
        />
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
