import {computed, watch, ref} from 'actview';
import { inertValue } from '@/utils/inertValue';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import { PreviewCardPositionerContext } from './PreviewCardPositionerContext';
import {
  useAnchorPositioning,
  type Side,
  type Align,
  type UseAnchorPositioningSharedParameters,
} from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { usePreviewCardPortalContext } from '../portal/PreviewCardPortalContext';
import { InternalBackdrop } from '@/utils/InternalBackdrop';
import { REASONS } from '@/internals/reasons';
import { POPUP_COLLISION_AVOIDANCE } from '@/internals/constants';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { usePositioner } from '@/utils/usePositioner';
import { useAnchoredPopupScrollLock } from '@/utils/useAnchoredPopupScrollLock';

/**
 * Positions the preview-card against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI PreviewCard](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardPositioner(componentProps: PreviewCardPositioner.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 定位参数为初始化型快照（useAnchorPositioning 在 setup 构建中间件链——
  // 动态 side/align 需整体重建，记录为已知限制）。
  const {
    anchor,
    positionMethod,
    side,
    align,
    sideOffset,
    alignOffset,
    collisionBoundary = 'clipping-ancestors',
    collisionPadding,
    arrowPadding,
    sticky,
    disableAnchorTracking = false,
    collisionAvoidance = POPUP_COLLISION_AVOIDANCE,
  } = componentProps as any;

  const store = usePreviewCardRootContext(false);
  const keepMounted = usePreviewCardPortalContext();

  const floatingRootContext = store.useState('floatingRootContext');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const openReason = store.useState('openChangeReason');
  const triggerElement = store.useState('activeTriggerElement');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const adaptiveOrigin = store.useState('adaptiveOrigin');
  const domReference = (floatingRootContext.value as any)?.useState('domReferenceElement');

  const previousTriggerRef = ref(null as Element | null);
  const runOnceAnimationsFinish = useAnimationsFinished(positionerElement);

  const positioner = useAnchorPositioning({
    anchor,
    floatingRootContext: floatingRootContext.value,
    positionMethod,
    mounted,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    collisionBoundary,
    collisionPadding,
    sticky,
    disableAnchorTracking,
    keepMounted,
    collisionAvoidance,
    adaptiveOrigin: adaptiveOrigin.value as any,
  });

  // When the current trigger element changes, enable transitions on the
  // positioner temporarily.
  watch(
    () => domReference?.value,
    (current: Element | null | undefined) => {
      const prevTriggerElement = previousTriggerRef.value;

      if (current) {
        previousTriggerRef.value = current;
      }

      if (prevTriggerElement && current && current !== prevTriggerElement) {
        store.set('instantType', undefined);
        const ac = new AbortController();
        runOnceAnimationsFinish(() => {
          store.set('instantType', 'trigger-change');
        }, ac.signal);

        return () => {
          ac.abort();
        };
      }

      return undefined;
    },
    {flush: 'post', immediate: true},
  );

  const trueModalNonHover = () => modal.value === true && openReason.value !== REASONS.triggerHover;

  // reactive inputs（一次性 setup 下快照布尔会让锁失效）
  useAnchoredPopupScrollLock(
    computed(() => open.value && trueModalNonHover()),
    computed(() => openMethod.value === 'touch'),
    positionerElement,
    triggerElement as any,
  );

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  // useAnchorPositioning 返回 computed 字段（side/align/anchorHidden 等随
  // flip/shift 更新）——state 与 context 载体逐字段求值。
  const state = computed<PreviewCardPositionerState>(() => ({
    open: open.value,
    side: positioner.side.value,
    align: positioner.align.value,
    anchorHidden: positioner.anchorHidden.value,
    instant: instantType.value as any,
    transitionStatus: transitionStatus.value as any,
  }));

  const element = usePositioner(componentProps as any, state as any, {
    styles: positioner.positionerStyles,
    transitionStatus,
    refs: [store.useStateSetter('positionerElement')],
    hidden: () => !mounted.value,
    inert: () => !open.value,
  }) as any;

  // store-as-is 载体：身份稳定的 getter 对象——side/align/anchorHidden/
  // arrowUncentered/arrowStyles 渲染期求值；arrowRef 为稳定 ref。
  const contextValue = {
    get side() {
      return positioner.side.value;
    },
    get align() {
      return positioner.align.value;
    },
    get anchorHidden() {
      return positioner.anchorHidden.value;
    },
    arrowRef: positioner.arrowRef,
    get arrowUncentered() {
      return positioner.arrowUncentered.value;
    },
    get arrowStyles() {
      return positioner.arrowStyles.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <PreviewCardPositionerContext.Provider value={contextValue as any}>
      {mounted.value && trueModalNonHover() && (
        <InternalBackdrop inert={inertValue(!open.value)} cutout={triggerElement.value} />
      )}
      {element()}
    </PreviewCardPositionerContext.Provider>
  );
}

export interface PreviewCardPositionerState {
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
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
  /**
   * Whether CSS transitions should be disabled.
   */
  instant: string | undefined;
  /**
   * The transition status of the component.
   */
  transitionStatus: any;
}

export interface PreviewCardPositionerProps
  extends UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', PreviewCardPositionerState> {
  children?: any;
  [key: string]: any;
}

export namespace PreviewCardPositioner {
  export type State = PreviewCardPositionerState;
  export type Props = PreviewCardPositionerProps;
}
