import { ref } from 'actview';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { platform } from '@base-ui/actview-utils/platform';
import { visuallyHidden } from '@base-ui/actview-utils/visuallyHidden';
import type { HTMLProps } from '../internals/types';

/**
 * @internal
 */
export function FocusGuard(props: HTMLProps) {
  const role = ref<'button' | undefined>(undefined);

  useIsoLayoutEffect(() => {
    // Unlike NVDA and JAWS, VoiceOver's virtual cursor triggers `onFocus` as
    // it moves — but only on focusable/role-button elements through WebKit's
    // NSAccessibility path. Setting `role="button"` lets the focus trap catch
    // the cursor.
    if (platform.screenReader.voiceOver && platform.engine.webkit) {
      role.value = 'button';
    }
  });

  return (
    <span
      {...props}
      style={visuallyHidden}
      aria-hidden={role.value ? undefined : true}
      tabIndex={0}
      // Role is only for VoiceOver
      role={role.value}
      data-base-ui-focus-guard=""
    />
  );
}
