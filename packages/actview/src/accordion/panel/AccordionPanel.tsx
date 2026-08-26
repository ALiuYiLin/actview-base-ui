import {computed, onUnmounted, toValue, watch, ref, toRefs, unrefs} from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';
import { useCollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useCollapsiblePanel } from '@/collapsible/panel/useCollapsiblePanel';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import type { AccordionRoot } from '../root/AccordionRoot';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import { AccordionPanelCssVars } from '../AccordionDataAttributes';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionPanel(componentProps: AccordionPanel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const {hiddenUntilFound: contextHiddenUntilFound, keepMounted: contextKeepMounted} = toValue(
    useAccordionRootContext(),
  );

  const {
    defaultPanelId,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setPanelIdState,
    setOpen,
    transitionStatus,
  } = toValue(useCollapsibleRootContext());

  const hiddenUntilFound = computed(
    () => toValue(componentProps.hiddenUntilFound) ?? toValue(contextHiddenUntilFound),
  );
  const keepMounted = computed(
    () => toValue(componentProps.keepMounted) ?? toValue(contextKeepMounted),
  );
  const registeredId = computed(() => toValue(componentProps.id) || undefined);
  const id = computed(() => toValue(componentProps.id) ?? defaultPanelId);

  // dev 警告：keepMounted={false} + hiddenUntilFound
  if (process.env.NODE_ENV !== 'production') {
    watch(
      () => [toValue(componentProps.keepMounted), hiddenUntilFound.value],
      ([keepMountedProp, hiddenUntilFoundValue]) => {
        if (keepMountedProp === false && hiddenUntilFoundValue) {
          console.warn(
            'Base UI: The `keepMounted={false}` prop on an `Accordion.Panel` is ignored when ' +
              '`hiddenUntilFound` is enabled on the panel or root, since the panel must remain ' +
              'mounted while closed.',
          );
        }
      },
      {immediate: true},
    );
  }

  // 注册 panel id 到 CollapsibleRoot（卸载时注销）
  const latestRegisteredId = ref(undefined as string | undefined);
  watch(
    () => registeredId.value,
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
    hiddenUntilFound: () => hiddenUntilFound.value,
    id: () => id.value,
    keepMounted: () => keepMounted.value,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setOpen,
    transitionStatus,
  });

  const {state, triggerId} = toValue(useAccordionItemContext());

  const panelState = computed<AccordionPanelState>(() => ({
    ...toValue(state),
    transitionStatus: toValue(panel.transitionStatus),
  }));

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const stateValue = toValue(panelState);
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(stateValue) : style?.value;

      const merged: any = mergePropsN([
        panel.props(),
        {
          'aria-labelledby': toValue(triggerId),
          role: 'region',
          style: {
            [AccordionPanelCssVars.accordionPanelHeight as string]:
              toValue(panel.height) === undefined ? 'auto' : `${toValue(panel.height)}px`,
            [AccordionPanelCssVars.accordionPanelWidth as string]:
              toValue(panel.width) === undefined ? 'auto' : `${toValue(panel.width)}px`,
          },
        },
        {...unrefs(elementProps)},
        resolvedStyle ? {style: resolvedStyle} : undefined,
        toValue(panel.shouldPreventOpenAnimation) ? {style: {animationName: 'none'}} : undefined,
      ]);
      return [merged];
    },
    state: () => toValue(panelState),
    stateAttributesMapping: accordionStateAttributesMapping,
    className,
    style,
    render,
    refs: () => [panel.ref as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{!toValue(panel.shouldRender) ? null : element()}</>;
}

export interface AccordionPanelState extends AccordionItemState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface AccordionPanelProps
  extends
    BaseUIComponentProps<'div', AccordionPanelState>,
    Pick<AccordionRoot.Props, 'hiddenUntilFound' | 'keepMounted'> {}

export namespace AccordionPanel {
  export type State = AccordionPanelState;
  export type Props = AccordionPanelProps;
}
