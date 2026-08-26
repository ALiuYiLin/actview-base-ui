import { ref, toRefs, unrefs } from 'actview';
import { useDialogRootContext } from '../root/DialogRootContext';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { DialogHandle } from '../store/DialogHandle';
import { useClick } from '@/floating-ui-react';
import { useButton } from '@/internals/use-button/useButton';
import { useTriggerFocusGuards } from '@/utils/popups/useTriggerFocusGuards';
import { FocusGuard } from '@/utils/FocusGuard';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A button that opens the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogTrigger(componentProps: DialogTrigger.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {disabled = false, nativeButton = true, handle} = componentProps as any;
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const dialogHandleStore = usePopupHandleStore(handle as any);
  const handleStore = dialogHandleStore.value;
  const rootStore = useDialogRootContext(true);

  const store: any = handleStore ?? rootStore;

  if (store === undefined) {
    throw new Error(
      'Base UI: <Dialog.Trigger> must be either used within a <Dialog.Root> component or provided with a handle.',
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

  const {preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus} =
    useTriggerFocusGuards(store, triggerElementRef);

  const {element} = useRenderElement({
    props: () => {
      const merged: any = mergePropsN<any>([
        click.reference ?? {},
        {
          id: thisTriggerId,
          'aria-haspopup': 'dialog' as const,
        },
        {...unrefs(elementProps)},
        getButtonProps,
      ]);
      const openAttr = triggerOpenStateMapping.open(isOpenedByThisTrigger.value);
      if (openAttr) {
        Object.assign(merged, openAttr);
      }
      if (disabled) {
        merged['data-disabled'] = '';
      } else {
        delete merged['data-disabled'];
      }
      return [merged];
    },
    state: () => ({
      disabled,
      open: isOpenedByThisTrigger.value,
    }),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLElement | null) => {
          triggerElementRef.value = el;
        },
      ];
      if (buttonRef) {
        refs.push(buttonRef);
      }
      if (registerTrigger) {
        refs.push(registerTrigger);
      }
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // actview 渲染无法原地 patch 结构切换，始终使用稳定的 div 包裹结构。
  return (
    <div key={`${thisTriggerId}-guards`}>
      <FocusGuard
        ref={(el: any) => (preFocusGuardRef.value = el)}
        onFocus={handlePreFocusGuardFocus}
      />
      {element()}
      <FocusGuard
        ref={(el: any) => (store.context.triggerFocusTargetRef.value = el)}
        onFocus={handleFocusTargetFocus}
      />
    </div>
  );
}

export interface DialogTriggerState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
}

export interface DialogTriggerProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', DialogTriggerState> {
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

export namespace DialogTrigger {
  export type State = DialogTriggerState;
  export type Props = DialogTriggerProps;
}
