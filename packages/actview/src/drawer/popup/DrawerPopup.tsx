import { computed, ref, toRefs } from 'actview';
import { FloatingFocusManager } from '@/floating-ui-react';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { useDrawerPortalContext } from '../portal/DrawerPortalContext';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { COMPOSITE_KEYS } from '@/internals/composite/composite';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A container for the Drawer contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/Drawer)
 */
export function DrawerPopup(componentProps: DrawerPopup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = useDialogRootContext(false);
  useDrawerPortalContext();

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const descriptionElementId = store.useState('descriptionElementId');
  const floatingRootContext = store.useState('floatingRootContext');
  const rootPopupProps = store.useState('popupProps');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const nestedOpenDrawerCount = store.useState('nestedOpenDrawerCount');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const titleElementId = store.useState('titleElementId');
  const transitionStatus = store.useState('transitionStatus');
  const role = store.useState('role');
  // nested 在 setup 读取（useState 内含 onUnmounted——computed 内调用会报
  // 「生命周期钩子只能在组件 setup 中调用」）。
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

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<DrawerPopupState>(() => ({
    open: open.value,
    nested: nested.value,
    transitionStatus: transitionStatus.value,
    nestedDrawerOpen: nestedOpenDrawerCount.value > 0,
  }));

  // 根元素 props：store popupProps → id/aria/role/嵌套样式 → 挂载过渡样式 →
  // 透传 → open/transition data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const stateValue = state.value;
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
          '--nested-drawers': nestedOpenDrawerCount.value,
        },
      },
      getDisabledMountTransitionStyles(transitionStatus.value),
      elementProps.value,
    ]);
    Object.assign(merged, attributes);
    return merged;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const FocusManager = FloatingFocusManager as any;
  return (
    <FocusManager
      context={floatingRootContext.value as any}
      openInteractionType={openMethod.value as any}
      disabled={!mounted.value}
      closeOnFocusOut
      initialFocus={(componentProps.initialFocus === undefined ? true : componentProps.initialFocus) as any}
      returnFocus={componentProps.finalFocus === undefined ? true : componentProps.finalFocus}
      modal={modal.value !== false}
      restoreFocus="popup"
    >
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(
            (el: HTMLElement | null) => {
              store.context.popupRef.value = el;
              setPopupElement(el);
              localFloatingElement.value = el;
              (floatingRootContext.value as any)?.update?.({floatingElement: el});
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </FocusManager>
  );
}

export interface DrawerPopupState {
  /**
   * Whether the Drawer is currently open.
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
   * Whether there are any open nested Drawers.
   */
  nestedDrawerOpen: boolean;
}

export interface DrawerPopupProps extends BaseUIComponentProps<'div', DrawerPopupState> {
  children?: any;
  /**
   * Determines the element to focus when the Drawer is closed.
   */
  finalFocus?:
    | boolean
    | Ref<HTMLElement | null>
    | {value: HTMLElement | null}
    | ((closeType: any) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the Drawer is opened.
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

export namespace DrawerPopup {
  export type Props = DrawerPopupProps;
  export type State = DrawerPopupState;
}
