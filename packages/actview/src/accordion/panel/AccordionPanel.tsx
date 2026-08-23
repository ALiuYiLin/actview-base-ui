import { computed, defineComponent, onUnmounted, toValue, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
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

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionPanel = defineComponent(function (componentProps: AccordionPanel.Props) {
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
  const latestRegisteredId = {current: undefined as string | undefined};
  watch(
    () => registeredId.value,
    (registeredIdValue) => {
      latestRegisteredId.current = registeredIdValue;
      setPanelIdState((currentId: string | null | undefined) =>
        registeredIdValue ?? (currentId === null ? undefined : currentId),
      );
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    setPanelIdState((currentId: string | null | undefined) =>
      currentId === latestRegisteredId.current ? null : currentId,
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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    if (!toValue(panel.shouldRender)) {
      return null;
    }

    const {className, render, style, ...elementProps} = componentProps;

    const stateValue = toValue(panelState);
    const stateAttributes = getStateAttributesProps(stateValue, accordionStateAttributesMapping);

    const resolvedStyle = typeof style === 'function' ? style(stateValue) : style;

    const merged: HTMLProps = mergePropsN([
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
      elementProps,
      stateAttributes,
      resolvedStyle ? {style: resolvedStyle} : undefined,
      toValue(panel.shouldPreventOpenAnimation) ? {style: {animationName: 'none'}} : undefined,
    ]);

    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: panel.ref as any});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={panel.ref as any} />;
    }
    return <div {...merged} ref={panel.ref as any} />;
  };
}) as unknown as (props: AccordionPanel.Props) => JSX.Element;

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
