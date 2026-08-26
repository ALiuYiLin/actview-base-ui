import { computed, ref, toRefs, unrefs } from 'actview';
import { FloatingFocusManager } from '@/floating-ui-react';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useDialogPortalContext } from '../portal/DialogPortalContext';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { COMPOSITE_KEYS } from '@/internals/composite/composite';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A container for the dialog contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogPopup(componentProps: DialogPopup.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {finalFocus, initialFocus} = componentProps;
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const store = useDialogRootContext(false);
  useDialogPortalContext();

  const descriptionElementId = store.useState('descriptionElementId');
  const floatingRootContext = store.useState('floatingRootContext');
  const rootPopupProps = store.useState('popupProps');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const nestedOpenDialogCount = store.useState('nestedOpenDialogCount');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const titleElementId = store.useState('titleElementId');
  const transitionStatus = store.useState('transitionStatus');
  const role = store.useState('role');
  const nested = store.useState('nested');
  const floatingId = (floatingRootContext.value as any)?.useState('floatingId');

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  const setPopupElement = store.useStateSetter('popupElement');

  // actview 版：floatingElement 通过 useSyncedValue 同步（与 useFloating 相同链），
  // 保证 FFM 的 focus-on-open watch 能观察到 floatingElement 变化。
  const localFloatingElement = ref<HTMLElement | null | undefined>(undefined);
  const syncedFloatingElement = computed(() =>
    localFloatingElement.value === undefined ? null : localFloatingElement.value,
  );
  (floatingRootContext.value as any)?.useSyncedValue?.(
    'floatingElement',
    syncedFloatingElement as any,
  );

  const state = (): DialogPopupState => ({
    open: open.value,
    // nested 在 setup 解构（useState 内含 onUnmounted——渲染期调用会在
    // Teleport 内容挂载路径报"生命周期钩子只能在组件 setup 中调用"）。
    nested: nested.value,
    transitionStatus: transitionStatus.value,
    nestedDialogOpen: nestedOpenDialogCount.value > 0,
  });

  const {element} = useRenderElement({
    props: () => {
      const stateValue = state();
      const attributes: Record<string, string> = {};
      if (stateValue.open) {
        attributes['data-open'] = '';
      } else {
        attributes['data-closed'] = '';
      }
      if (stateValue.transitionStatus === 'starting') {
        attributes['data-starting-style'] = '';
      } else if (stateValue.transitionStatus === 'ending') {
        attributes['data-ending-style'] = '';
      }

      const merged: any = mergePropsN<any>([
        rootPopupProps.value,
        {
          id: floatingId?.value,
          'aria-labelledby': titleElementId.value,
          'aria-describedby': descriptionElementId.value,
          'aria-modal': modal.value !== false ? 'true' : undefined,
          role: role.value,
          tabIndex: -1,
          hidden: !mounted.value,
          onKeyDown(event: any) {
            if (COMPOSITE_KEYS.has(event.key)) {
              event.stopPropagation();
            }
          },
          style: {
            '--nested-dialogs': nestedOpenDialogCount.value,
          },
        },
        getDisabledMountTransitionStyles(transitionStatus.value),
        unrefs(elementProps),
      ]);
      Object.assign(merged, attributes);
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLElement | null) => {
          store.context.popupRef.value = el;
          setPopupElement(el);
          localFloatingElement.value = el;
          (floatingRootContext.value as any)?.update?.({floatingElement: el});
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const FocusManager = FloatingFocusManager as any;
  return (
    <FocusManager
      context={floatingRootContext.value as any}
      openInteractionType={openMethod.value as any}
      disabled={!mounted.value}
      closeOnFocusOut
      initialFocus={(initialFocus === undefined ? true : initialFocus) as any}
      returnFocus={finalFocus === undefined ? true : finalFocus}
      modal={modal.value !== false}
      restoreFocus="popup"
    >
      {element()}
    </FocusManager>
  );
}

export interface DialogPopupState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  /**
   * Whether the component is nested.
   */
  nested: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether there are any open nested dialogs.
   */
  nestedDialogOpen: boolean;
}

export interface DialogPopupProps extends BaseUIComponentProps<'div', DialogPopupState> {
  children?: any;
  /**
   * Determines the element to focus when the dialog is closed.
   */
  finalFocus?:
    | boolean
    | Ref<HTMLElement | null>
    | {value: HTMLElement | null}
    | ((closeType: any) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the dialog is opened.
   */
  initialFocus?:
    | boolean
    | HTMLElement
    | Ref<HTMLElement | null>
    | {value: HTMLElement | null}
    | ((interactionType: any) => boolean | HTMLElement | null | void)
    | undefined;
  [key: string]: any;
}

export namespace DialogPopup {
  export type Props = DialogPopupProps;
  export type State = DialogPopupState;
}
