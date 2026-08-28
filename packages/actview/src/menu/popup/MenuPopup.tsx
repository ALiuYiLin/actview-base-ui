import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { InteractionType } from '@/utils/useEnhancedClickHandler';
import { FloatingFocusManager, useHoverFloatingInteraction } from '@/floating-ui-react';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useToolbarRootContext } from '@/toolbar/root/ToolbarRootContext';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { COMPOSITE_KEYS } from '@/internals/composite/composite';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
import { useTreeCloseEvents } from './useTreeCloseEvents';

/**
 * A container for the menu contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPopup(componentProps: MenuPopup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const {store} = useMenuRootContext();
  const positionerContext = useMenuPositionerContext();
  const toolbarContext = useToolbarRootContext(true);
  const {side, align} = positionerContext ?? {
    side: 'bottom' as const,
    align: 'start' as const,
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const open = store.useState('open');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const mounted = store.useState('mounted');
  const instantType = store.useState('instantType');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const parent = store.useState('parent');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const rootId = store.useState('rootId');
  const floatingContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const closeDelay = store.useState('closeDelay');
  const hoverEnabled = store.useState('hoverEnabled');
  const disabled = store.useState('disabled');
  const openMethod = store.useState('openMethod');

  const isContextMenu = parent.value.type === 'context-menu';

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  // 事件 handler：setup 闭包。
  const handleCloseEvent = (event: any) => {
    store.setOpen(false, createChangeEventDetails(event.reason, event.domEvent));
  };

  useHoverFloatingInteraction(floatingContext.value as any, {
    enabled:
      hoverEnabled.value &&
      !disabled.value &&
      !isContextMenu &&
      parent.value.type !== 'menubar',
    closeDelay: closeDelay.value,
  });

  const setPopupElement = store.useStateSetter('popupElement');

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuPopupState>(() => ({
    transitionStatus: transitionStatus.value,
    side: side as any,
    align: align as any,
    open: open.value,
    nested: parent.value.type === 'menu',
    instant: instantType.value as any,
  }));

  // 订阅 floating tree 的 close 事件
  useTreeCloseEvents(floatingTreeRoot, handleCloseEvent);

  // 根元素 props：store popupProps → keydown 拦截 → 挂载过渡样式 → 透传 →
  // rootownerid → open/transition data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const stateValue = state.value;
    const attributes: Record<string, string> = {};
    const openAttr = stateValue.open ? {'data-open': ''} : {'data-closed': ''};
    Object.assign(attributes, openAttr);
    if (stateValue.transitionStatus === 'starting') {
      attributes['data-starting-style'] = '';
    } else if (stateValue.transitionStatus === 'ending') {
      attributes['data-ending-style'] = '';
    }

    const merged: any = mergePropsN<any>([
      popupProps.value,
      {
        onKeyDown(event: any) {
          if (toolbarContext && COMPOSITE_KEYS.has(event.key)) {
            event.stopPropagation();
          }
        },
      },
      getDisabledMountTransitionStyles(transitionStatus.value),
      elementProps.value,
      {'data-rootownerid': rootId.value},
    ]);
    Object.assign(merged, attributes);
    return merged;
  });

  const returnFocus = computed(() => {
    if (
      activeTriggerElement.value ||
      (parent.value.type === 'menubar' && lastOpenChangeReason.value !== REASONS.outsidePress)
    ) {
      return true;
    }
    return parent.value.type === undefined || isContextMenu;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const FocusManager = FloatingFocusManager as any;
  return (
    <FocusManager
      context={floatingContext.value as any}
      openInteractionType={openMethod.value as any}
      modal={isContextMenu}
      disabled={!mounted.value}
      returnFocus={componentProps.finalFocus === undefined ? returnFocus.value : (componentProps.finalFocus as any)}
      initialFocus={parent.value.type !== 'menu'}
      restoreFocus
      externalTree={parent.value.type !== 'menubar' ? floatingTreeRoot.value : undefined}
      previousFocusableElement={activeTriggerElement.value as HTMLElement | null}
      nextFocusableElement={
        parent.value.type === undefined
          ? (store.context.triggerFocusTargetRef as any)
          : undefined
      }
      beforeContentFocusGuardRef={
        parent.value.type === undefined
          ? (store.context.beforeContentFocusGuardRef as any)
          : undefined
      }
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
              // 同步 floating 元素到 rootContext state（FFM/useDismiss 依赖 floatingElement）。
              (floatingContext.value as any)?.update?.({floatingElement: el});
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </FocusManager>
  );
}

export interface MenuPopupProps extends BaseUIComponentProps<'div', MenuPopupState> {
  children?: any;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Determines the element to focus when the menu is closed.
   */
  finalFocus?:
    | boolean
    | Ref<HTMLElement | null>
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
}

export interface MenuPopupState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * The side of the anchor the component is placed on.
   */
  side: 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
  /**
   * The alignment of the component relative to the anchor.
   */
  align: 'start' | 'center' | 'end';
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * Whether the component is nested.
   */
  nested: boolean;
  /**
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'click' | 'group' | 'trigger-change' | undefined;
}

export namespace MenuPopup {
  export type Props = MenuPopupProps;
  export type State = MenuPopupState;
}
