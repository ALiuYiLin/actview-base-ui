import { computed } from 'actview';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { type BaseUIComponentProps, type NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import type { ToolbarRoot, ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';

/**
 * A button that can be used as-is or as a trigger for other components.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarButton(componentProps: ToolbarButton.Props) {
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

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled,
    native: computed(() => componentProps.nativeButton ?? true),
  });

  const state = computed<ToolbarButtonState>(() => ({
    disabled: disabled.value,
    orientation: rootContext.value.orientation,
    focusable: focusableWhenDisabled.value,
  }));

  const getElementProps = () => {
    const {
      className: _className,
      disabled: _disabled,
      focusableWhenDisabled: _focusableWhenDisabled,
      render: _render,
      nativeButton: _nativeButton,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const getConditionalDisabledProps = () =>
    componentProps.render ? { disabled: disabled.value } : EMPTY_OBJECT;

  return (
    <CompositeItem<ToolbarRoot.ItemMetadata, ToolbarButtonState>
      tag="button"
      render={componentProps.render}
      className={componentProps.className as any}
      style={componentProps.style as any}
      metadata={itemMetadata}
      state={state.value}
      refs={[componentProps.ref, buttonRef]}
      props={[
        getElementProps,
        // When a render prop is provided (typically another Base UI component
        // like Menu.Trigger), forward `disabled` so the rendered component can
        // derive its own disabled state. For the default toolbar button, avoid
        // forwarding a disabled prop so focusable disabled buttons remain
        // hoverable for interactions like tooltips.
        // TODO: follow up after https://github.com/mui/base-ui/issues/1976#issuecomment-2916905663
        getConditionalDisabledProps,
        getButtonProps,
      ]}
    />
  );
}

export interface ToolbarButtonState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToolbarButtonState> {
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
}

export namespace ToolbarButton {
  export type State = ToolbarButtonState;
  export type Props = ToolbarButtonProps;
}
