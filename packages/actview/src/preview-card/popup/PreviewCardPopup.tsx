import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { InteractionType } from '@/utils/useEnhancedClickHandler';
import { FloatingFocusManager, useHoverFloatingInteraction } from '@/floating-ui-react';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { REASONS } from '@/internals/reasons';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { mergePropsN } from '@/merge-props';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A container for the preview-card contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI PreviewCard](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardPopup(componentProps: PreviewCardPopup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值；
  // positioner 载体 getter 字段渲染期属性访问。
  const store = usePreviewCardRootContext(false)!;
  const positioner = usePreviewCardPositionerContext();

  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const titleId = store.useState('titleElementId');
  const descriptionId = store.useState('descriptionElementId');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const openReason = store.useState('openChangeReason');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const floatingContext = store.useState('floatingRootContext');
  const floatingId = (floatingContext.value as any)?.useState('floatingId');
  const disabled = store.useState('disabled');
  const openOnHover = store.useState('openOnHover');
  const closeDelay = store.useState('closeDelay');

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  useHoverFloatingInteraction(floatingContext.value as any, {
    enabled: openOnHover.value && !disabled.value,
    closeDelay: closeDelay.value,
  });

  // actview 简化：modal 焦点管理不要求渲染 PreviewCard.Close（react 版通过
  // ClosePartContext 计数决定 focusManagerModal）。
  const focusManagerModal = modal.value !== false;

  const setPopupElement = store.useStateSetter('popupElement');

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<PreviewCardPopupState>(() => ({
    open: open.value,
    side: positioner?.side ?? ('bottom' as Side),
    align: positioner?.align ?? ('start' as Align),
    instant: instantType.value as any,
    transitionStatus: transitionStatus.value,
  }));

  // 根元素 props：store popupProps → id/role/aria → 挂载过渡样式 → 透传 →
  // open/transition data-*。
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
      popupProps.value,
      {
        id: floatingId?.value,
        role: 'dialog',
        tabIndex: -1,
        'aria-labelledby': titleId.value,
        'aria-describedby': descriptionId.value,
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
      context={floatingContext.value as any}
      openInteractionType={openMethod.value as any}
      modal={focusManagerModal}
      disabled={!mounted.value || openReason.value === REASONS.triggerHover}
      initialFocus={(componentProps.initialFocus === undefined ? true : componentProps.initialFocus) as any}
      returnFocus={componentProps.finalFocus === undefined ? true : componentProps.finalFocus}
      restoreFocus="popup"
      previousFocusableElement={activeTriggerElement.value as HTMLElement | null}
      nextFocusableElement={store.context.triggerFocusTargetRef}
      beforeContentFocusGuardRef={store.context.beforeContentFocusGuardRef}
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

export interface PreviewCardPopupState {
  /**
   * Whether the preview-card is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'click' | 'focus' | 'trigger-change' | undefined;
}

export interface PreviewCardPopupProps extends BaseUIComponentProps<'div', PreviewCardPopupState> {
  children?: any;
  /**
   * Determines the element to focus when the preview-card is closed.
   */
  finalFocus?:
    | boolean
    | Ref<HTMLElement | null>
    | {value: HTMLElement | null}
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  [key: string]: any;
}

export namespace PreviewCardPopup {
  export type Props = PreviewCardPopupProps;
  export type State = PreviewCardPopupState;
}
