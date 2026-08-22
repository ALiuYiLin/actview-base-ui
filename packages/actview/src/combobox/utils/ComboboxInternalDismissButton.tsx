import { visuallyHiddenInput } from '@base-ui/actview-utils/visuallyHidden';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useButton } from '@/internals/use-button';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';

type DismissEvent = MouseEvent | KeyboardEvent;

/**
 * @internal
 */
export function ComboboxInternalDismissButton(props: { ref?: any }) {
  const store = useComboboxRootContext();

  const { buttonRef, getButtonProps } = useButton({
    native: false,
  });

  const mergedRef = useMergedRefs(props.ref, buttonRef);

  function handleDismiss(event: DismissEvent) {
    store.state.setOpen(false, createChangeEventDetails(REASONS.closePress, event, event.currentTarget as Element));
  }

  const dismissProps = getButtonProps({
    onClick: handleDismiss,
  });

  return (
    <span
      ref={mergedRef}
      {...(dismissProps as any)}
      aria-label="Dismiss"
      tabIndex={undefined}
      style={visuallyHiddenInput}
    />
  );
}
