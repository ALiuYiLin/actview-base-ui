import { computed } from 'actview';
import { type BaseUIComponentProps, type HTMLProps } from '../../internals/types';
import { useFocusableWhenDisabled } from '../../utils/useFocusableWhenDisabled';
import type { ToolbarRoot, ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';

/**
 * A native input element that integrates with Toolbar keyboard navigation.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarInput(componentProps: ToolbarInput.Props) {
  const rootContext = useToolbarRootContext();
  const groupContext = useToolbarGroupContext();

  const disabled = computed(
    () =>
      (rootContext.value.disabled ?? false) ||
      (groupContext.value?.disabled ?? false) ||
      (componentProps.disabled ?? false),
  );

  const focusableWhenDisabled = computed(() => componentProps.focusableWhenDisabled ?? true);

  const itemMetadata = {
    disabled: disabled.value,
    focusableWhenDisabled: focusableWhenDisabled.value,
  };

  const { props: focusableWhenDisabledProps } = useFocusableWhenDisabled({
    composite: true,
    disabled,
    focusableWhenDisabled,
    isNativeButton: false,
  });

  const state = computed<ToolbarInputState>(() => ({
    disabled: disabled.value,
    orientation: rootContext.value.orientation,
    focusable: focusableWhenDisabled.value,
  }));

  const preventWhenDisabled = (event: Event) => {
    if (disabled.value) {
      event.preventDefault();
    }
  };

  const getDefaultProps = (): HTMLProps => ({
    onClick: preventWhenDisabled,
    onPointerDown: preventWhenDisabled,
  });

  const getElementProps = () => {
    const {
      className: _className,
      focusableWhenDisabled: _focusableWhenDisabled,
      render: _render,
      disabled: _disabled,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  return (
    <CompositeItem<ToolbarRoot.ItemMetadata, ToolbarInputState>
      tag="input"
      render={componentProps.render}
      className={componentProps.className as any}
      style={componentProps.style as any}
      metadata={itemMetadata}
      state={state.value}
      refs={[componentProps.ref]}
      props={[getDefaultProps, getElementProps, focusableWhenDisabledProps]}
    />
  );
}

export interface ToolbarInputState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarInputProps extends BaseUIComponentProps<'input', ToolbarInputState> {
  /**
   * When `true` the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When `true` the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
  defaultValue?: JSX.IntrinsicElements['input']['value'] | undefined;
}

export namespace ToolbarInput {
  export type State = ToolbarInputState;
  export type Props = ToolbarInputProps;
}
