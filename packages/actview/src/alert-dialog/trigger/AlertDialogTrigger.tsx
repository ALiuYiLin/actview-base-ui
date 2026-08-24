import { defineComponent, ref, toValue } from 'actview';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { DialogHandle } from '@/dialog/store/DialogHandle';
import { useClick } from '@/floating-ui-react';
import { useButton } from '@/internals/use-button/useButton';
import { useTriggerFocusGuards } from '@/utils/popups/useTriggerFocusGuards';

/**
 * A button that opens the AlertDialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI AlertDialog](https://base-ui.com/react/components/AlertDialog)
 */
export const AlertDialogTrigger = defineComponent(function AlertDialogTrigger(
  componentProps: AlertDialogTrigger.Props,
) {
  const {disabled = false, nativeButton = true, handle} = componentProps as any;
  const children = toValue(componentProps.children);

  const DialogHandleStore = usePopupHandleStore(handle as any);
  const handleStore = DialogHandleStore.value;
  const rootStore = useDialogRootContext(true);

  const store: any = handleStore ?? rootStore;

  if (store === undefined) {
    throw new Error(
      'Base UI: <AlertDialog.Trigger> must be either used within a <AlertDialog.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId((componentProps as any).id);
  const triggerElementRef = ref<HTMLElement | null>(null);

  const {registerTrigger, isMountedByThisTrigger} = useTriggerDataForwarding(
    thisTriggerId as any,
    triggerElementRef as any,
    store,
    {disabled} as any,
  );

  const floatingContext = store.useState('floatingRootContext');
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId as any);

  const click = useClick(floatingContext.value, {enabled: !disabled, event: 'mousedown'});

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton,
  });

  const state: AlertDialogTriggerState = {
    disabled,
    open: isOpenedByThisTrigger.value,
  };

  const {preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus} = useTriggerFocusGuards(
    store,
    triggerElementRef,
  );

  const propsList = [
    click.reference ?? {},
    {
      id: thisTriggerId,
      'aria-haspopup': 'AlertDialog' as const,
    },
    componentProps,
    getButtonProps,
  ];

  const refs = [
    (el: HTMLElement | null) => {
      triggerElementRef.value = el;
    },
    buttonRef,
    registerTrigger,
  ] as any[];

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const merged: any = mergePropsN<any>([...propsList]);
    const openAttr = triggerOpenStateMapping.open(isOpenedByThisTrigger.value);
    if (openAttr) {
      Object.assign(merged, openAttr);
    }
    if (disabled) {
      merged['data-disabled'] = '';
    } else {
      delete merged['data-disabled'];
    }

    const element = (
      <button {...merged} ref={mergeRefs(refs)}>
        {children}
      </button>
    );

    // actview 渲染无法原地 patch 结构切换，始终使用稳定的 div 包裹结构。
    return (
      <div key={`${thisTriggerId}-guards`}>
        <FocusGuard
          ref={(el: any) => (preFocusGuardRef.value = el)}
          onFocus={handlePreFocusGuardFocus}
        />
        {element}
        <FocusGuard
          ref={(el: any) => (store.context.triggerFocusTargetRef.value = el)}
          onFocus={handleFocusTargetFocus}
        />
      </div>
    );
  };
});

function mergeRefs(refs: any[]) {
  return (el: HTMLElement | null) => {
    for (const r of refs) {
      if (!r) continue;
      if (typeof r === 'function') {
        r(el);
      } else if (r.value !== undefined) {
        r.value = el;
      } else {
        r.value = el;
      }
    }
  };
}

import { FocusGuard } from '@/utils/FocusGuard';

export interface AlertDialogTriggerState {
  /**
   * Whether the AlertDialog is currently open.
   */
  open: boolean;
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
}

export interface AlertDialogTriggerProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', AlertDialogTriggerState> {
  children?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * @default true
   */
  nativeButton?: boolean | undefined;
  [key: string]: any;
}

export namespace AlertDialogTrigger {
  export type State = AlertDialogTriggerState;
  export type Props = AlertDialogTriggerProps;
}
