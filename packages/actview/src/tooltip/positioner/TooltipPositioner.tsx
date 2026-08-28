import { computed, watch, ref } from 'actview';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipPositionerContext } from './TooltipPositionerContext';
import {
  useAnchorPositioning,
  type Side,
  type Align,
  type UseAnchorPositioningSharedParameters,
} from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { useTooltipPortalContext } from '../portal/TooltipPortalContext';
import { POPUP_COLLISION_AVOIDANCE } from '@/internals/constants';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { usePositioner } from '@/utils/usePositioner';

/**
 * Positions the tooltip against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPositioner(componentProps: TooltipPositioner.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 定位参数为初始化型快照（useAnchorPositioning 在 setup 构建中间件链——
  // side/align 动态变化需整体重建，React 版每次 render 重跑；actview 简化为
  // 挂载期固定，动态 side/align 记录为已知限制）。
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

  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = useTooltipRootContext(false);
  const keepMounted = useTooltipPortalContext();

  const floatingRootContext = store.useState('floatingRootContext');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const adaptiveOrigin = store.useState('adaptiveOrigin');
  const domReference = (floatingRootContext.value as any)?.useState('domReferenceElement');

  const previousTriggerRef = ref(null as Element | null);
  const positionerElement = store.useState('positionerElement');
  const runOnceAnimationsFinish = useAnimationsFinished(positionerElement as any);

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
          store.set('instantType', 'delay');
        }, ac.signal);

        return () => {
          ac.abort();
        };
      }

      return undefined;
    },
    {flush: 'post', immediate: true},
  );

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  // useAnchorPositioning 返回 computed 字段（side/align/anchorHidden 等随
  // flip/shift 更新）——state 与 context 载体逐字段求值。
  const state = computed<TooltipPositionerState>(() => ({
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
    <TooltipPositionerContext.Provider value={contextValue as any}>
      {element()}
    </TooltipPositionerContext.Provider>
  );
}

export interface TooltipPositionerState {
  /**
   * Whether the tooltip is currently open.
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

export interface TooltipPositionerProps
  extends UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', TooltipPositionerState> {
  children?: any;
  [key: string]: any;
}

export namespace TooltipPositioner {
  export type State = TooltipPositionerState;
  export type Props = TooltipPositionerProps;
}
