import { usePopupRootStore, PopupHandleAttachment } from '@/utils/popups';
import { DialogRootContext } from './DialogRootContext';
import { DialogStore } from '../store/DialogStore';

/**
 * Renders the dialog root for a given mode ('dialog' | 'drawer' | 'alert-dialog').
 *
 * actview 简化：无 DialogInteractions 键盘/焦点拦截（焦点管理由 DialogPopup 的
 * FloatingFocusManager 承担，floating-ui actview 层已完整移植）、无 useOpenStateTransitions；
 * payload 为 store 的 payload 快照。
 */
export function useRenderDialogRoot(
  mode: 'dialog' | 'drawer' | 'alert-dialog',
  props: any,
) {
  const {
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onOpenChangeComplete,
    modal: modalProp = true,
    disablePointerDismissal: disablePointerDismissalProp = false,
    handle,
    triggerId: triggerIdProp,
    defaultTriggerId: defaultTriggerIdProp = null,
  } = props ?? {};

  const isAlertDialog = mode === 'alert-dialog';
  const modal = isAlertDialog ? true : modalProp;
  const disablePointerDismissal = isAlertDialog || disablePointerDismissalProp;
  const role: 'dialog' | 'alertdialog' = isAlertDialog ? 'alertdialog' : 'dialog';

  const store = usePopupRootStore(
    (floatingId, floatingNested) =>
      new DialogStore(
        {
          open: defaultOpen,
          openProp,
          activeTriggerId: defaultTriggerIdProp,
          triggerIdProp,
          modal,
          disablePointerDismissal,
          role,
        } as any,
        floatingId,
        floatingNested,
      ),
    true,
  );

  store.useControlledProp('openProp', openProp);
  store.useSyncedValues({modal, role} as any);
  store.useContextCallback('onOpenChange', onOpenChange);
  store.useContextCallback('onOpenChangeComplete', onOpenChangeComplete);

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload');

  return () => (
    <DialogRootContext.Provider value={store as any}>
      {handle && <PopupHandleAttachment handle={handle} store={store} />}
      {typeof children === 'function'
        ? children({payload: payload.value, open: open.value, mounted: mounted.value})
        : children}
    </DialogRootContext.Provider>
  );
}
