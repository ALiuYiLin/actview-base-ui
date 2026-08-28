import {computed, onUnmounted, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import type { CollapsibleRootState } from '../root/CollapsibleRoot';
import { collapsibleStateAttributesMapping } from '../root/stateAttributesMapping';
import { useCollapsiblePanel } from './useCollapsiblePanel';
import { CollapsiblePanelCssVars } from './CollapsiblePanelCssVars';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A panel with the collapsible contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsiblePanel(componentProps: CollapsiblePanel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）。⚠️ state 是 Root 侧 getter——不解构
  // （解构会捕获快照），经属性访问路由到 computed。
  const rootContextRef = useCollapsibleRootContext();
  const {
    defaultPanelId,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setPanelIdState,
    setOpen,
    transitionStatus,
  } = rootContextRef;
  const state = computed(() => rootContextRef.state);

  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const hiddenUntilFound = computed(() => componentProps.hiddenUntilFound ?? false);
  const keepMounted = computed(() => componentProps.keepMounted ?? false);
  const registeredId = computed(() => componentProps.id || undefined);
  const id = computed(() => registeredId.value ?? defaultPanelId);

  // dev 警告：hiddenUntilFound 覆盖 keepMounted={false}
  if (process.env.NODE_ENV !== 'production') {
    watch(
      () => [componentProps.hiddenUntilFound, componentProps.keepMounted] as const,
      ([hiddenUntilFoundProp, keepMountedProp]) => {
        if (hiddenUntilFoundProp && keepMountedProp === false) {
          console.warn(
            'Base UI: The `keepMounted={false}` prop on `Collapsible.Panel` is ignored when ' +
              '`hiddenUntilFound` is enabled, since the panel must remain mounted while closed.',
          );
        }
      },
      {immediate: true},
    );
  }

  // 注册 panel id（React useIsoLayoutEffect + cleanup）。组件卸载时 watch 的
  // onCleanup 不保证执行（effectScope stop 只停 effect），用 onUnmounted 显式清理。
  const latestRegisteredId = ref(registeredId.value);
  watch(
    registeredId,
    (registeredIdValue) => {
      latestRegisteredId.value = registeredIdValue;
      setPanelIdState((currentId: string | null | undefined) =>
        registeredIdValue ?? (currentId === null ? undefined : currentId),
      );
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    setPanelIdState((currentId: string | null | undefined) =>
      currentId === latestRegisteredId.value ? null : currentId,
    );
  });

  const panel = useCollapsiblePanel({
    externalRef: null,
    hiddenUntilFound,
    id,
    keepMounted,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setOpen,
    transitionStatus,
  });

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    // hiddenUntilFound/keepMounted 由 panel.props 承担——透传排除。
    delete out.hiddenUntilFound;
    delete out.keepMounted;
    return out;
  });

  const panelState = computed<CollapsiblePanelState>(() => ({
    ...state.value,
    transitionStatus: panel.transitionStatus.value,
  }));

  const panelStyle = computed(() => ({
    [CollapsiblePanelCssVars.collapsiblePanelHeight as string]:
      panel.height.value === undefined ? 'auto' : `${panel.height.value}px`,
    [CollapsiblePanelCssVars.collapsiblePanelWidth as string]:
      panel.width.value === undefined ? 'auto' : `${panel.width.value}px`,
  }));

  const userStyle = computed(() => {
    const resolved = typeof style?.value === 'function' ? style.value(panelState.value) : style?.value;
    return resolved ? {style: resolved} : undefined;
  });

  const preventOpenStyle = computed(() =>
    panel.shouldPreventOpenAnimation.value ? {style: {animationName: 'none'}} : undefined,
  );

  // 根元素 props：panel.props → css vars → 透传 → 用户 style → 首开动画抑制。
  const rootProps = computed(() =>
    mergePropsN<any>(
      [
        panel.props(),
        {style: panelStyle.value},
        elementProps.value,
        userStyle.value,
        preventOpenStyle.value,
      ].filter(Boolean) as Record<string, any>[],
    ),
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {panel.shouldRender.value
        ? useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: panelState.value,
              stateAttributesMapping: collapsibleStateAttributesMapping,
              ref: panel.ref,
              props: rootProps.value,
            },
          )
        : null}
    </>
  );
}

export interface CollapsiblePanelState extends CollapsibleRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface CollapsiblePanelProps extends BaseUIComponentProps<'div', CollapsiblePanelState> {
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   *
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is hidden.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace CollapsiblePanel {
  export type State = CollapsiblePanelState;
  export type Props = CollapsiblePanelProps;
}
