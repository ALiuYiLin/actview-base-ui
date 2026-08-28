import {computed, onUnmounted, toValue, watch, ref, toRefs, unrefs} from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import type { CollapsibleRootState } from '../root/CollapsibleRoot';
import { collapsibleStateAttributesMapping } from '../root/stateAttributesMapping';
import { useCollapsiblePanel } from './useCollapsiblePanel';
import { CollapsiblePanelCssVars } from './CollapsiblePanelCssVars';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A panel with the collapsible contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsiblePanel(componentProps: CollapsiblePanel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const {
    defaultPanelId,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setPanelIdState,
    setOpen,
    state,
    transitionStatus,
  } = toValue(useCollapsibleRootContext());

  const hiddenUntilFound = toValue(componentProps.hiddenUntilFound) ?? false;
  const keepMounted = toValue(componentProps.keepMounted) ?? false;
  const registeredId = toValue(componentProps.id) || undefined;
  const id = registeredId ?? defaultPanelId;

  // dev 警告：hiddenUntilFound 覆盖 keepMounted={false}
  if (process.env.NODE_ENV !== 'production') {
    watch(
      () => [toValue(componentProps.hiddenUntilFound), toValue(componentProps.keepMounted)],
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
  const latestRegisteredId = ref(registeredId);
  watch(
    () => registeredId,
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

  const panelState = computed<CollapsiblePanelState>(() => ({
    ...toValue(state),
    transitionStatus: toValue(panel.transitionStatus),
  }));

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {hiddenUntilFound: _hiddenUntilFound, keepMounted: _keepMounted, ...restElementProps} =
        unrefs(elementProps);

      const stateValue = toValue(panelState);

      const resolvedStyle = typeof style?.value === 'function' ? style.value(stateValue) : style?.value;

      return [
        panel.props(),
        {
          style: {
            [CollapsiblePanelCssVars.collapsiblePanelHeight as string]:
              toValue(panel.height) === undefined ? 'auto' : `${toValue(panel.height)}px`,
            [CollapsiblePanelCssVars.collapsiblePanelWidth as string]:
              toValue(panel.width) === undefined ? 'auto' : `${toValue(panel.width)}px`,
          },
        },
        restElementProps,
        resolvedStyle ? {style: resolvedStyle} : undefined,
        // Resolve the public `style` prop so temporary `animationName: 'none'`
        // can still win after user's inline styles have been merged.
        toValue(panel.shouldPreventOpenAnimation) ? {style: {animationName: 'none'}} : undefined,
      ].filter(Boolean) as Record<string, any>[];
    },
    state: () => toValue(panelState) as any,
    stateAttributesMapping: collapsibleStateAttributesMapping as any,
    className,
    render,
    refs: () => [panel.ref as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{toValue(panel.shouldRender) ? element() : null}</>;
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
