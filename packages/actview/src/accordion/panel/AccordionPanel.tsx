import { computed, defineComponent, watch } from 'actview';
import { warn } from '@base-ui/actview-utils/warn';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { resolveStyle } from '@/utils/resolveStyle';
import { useCollapsibleRootContext } from '@/collapsible/root/CollapsibleRootContext';
import { useCollapsiblePanel } from '@/collapsible/panel/useCollapsiblePanel';
import { useAccordionRootContext } from '@/accordion/root/AccordionRootContext';
import type { AccordionRoot } from '@/accordion/root/AccordionRoot';
import type { AccordionItemState } from '@/accordion/item/AccordionItem';
import { useAccordionItemContext } from '@/accordion/item/AccordionItemContext';
import { accordionStateAttributesMapping } from '@/accordion/item/stateAttributesMapping';
import { AccordionPanelCssVars } from '@/accordion/panel/AccordionPanelCssVars';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { mergePropsN } from '@/merge-props';

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionPanel = defineComponent(function (componentProps: AccordionPanel.Props) {
  // ================= setup（只执行一次） =================
  const rootContext = useAccordionRootContext();
  const collapsibleContext = useCollapsibleRootContext();
  const itemContext = useAccordionItemContext();

  const hiddenUntilFound = computed(
    () => componentProps.hiddenUntilFound ?? rootContext.value.hiddenUntilFound,
  );
  const keepMounted = computed(() => componentProps.keepMounted ?? rootContext.value.keepMounted);
  const registeredId = computed(() => componentProps.id || undefined);
  const id = computed(() => componentProps.id ?? collapsibleContext.value.defaultPanelId);

  /* istanbul ignore else -- `process.env.NODE_ENV` is a build-time constant under test */
  if (process.env.NODE_ENV !== 'production') {
    watch(
      [() => componentProps.keepMounted, () => componentProps.hiddenUntilFound],
      ([keepMountedProp, hiddenUntilFoundProp]) => {
        if (keepMountedProp === false && hiddenUntilFoundProp) {
          warn(
            'The `keepMounted={false}` prop on an `Accordion.Panel` is ignored when `hiddenUntilFound` is enabled on the panel or root, since the panel must remain mounted while closed.',
          );
        }
      },
    );
  }

  watch(
    registeredId,
    (regId, _old, onCleanup) => {
      const setPanelIdState = collapsibleContext.value.setPanelIdState;
      setPanelIdState((currentId) => regId ?? (currentId === null ? undefined : currentId));
      onCleanup(() => {
        setPanelIdState((currentId) => (currentId === regId ? null : currentId));
      });
    },
    { immediate: true },
  );

  const {
    height,
    props: panelProps,
    ref,
    shouldPreventOpenAnimation,
    shouldRender,
    transitionStatus: panelTransitionStatus,
    width,
  } = useCollapsiblePanel({
    externalRef: componentProps.ref,
    hiddenUntilFound,
    id,
    keepMounted,
    mounted: () => collapsibleContext.value.mounted,
    onOpenChange: collapsibleContext.value.onOpenChange,
    open: () => collapsibleContext.value.open,
    setMounted: collapsibleContext.value.setMounted,
    setOpen: collapsibleContext.value.setOpen,
    transitionStatus: () => collapsibleContext.value.transitionStatus,
  });

  const panelState = computed<AccordionPanelState>(() => ({
    ...itemContext.value.state,
    transitionStatus: panelTransitionStatus.value,
  }));

  const triggerId = computed(() => itemContext.value.triggerId);

  // ================= render（每次更新执行） =================
  return () => {
    if (!shouldRender.value) {
      return null;
    }

    const {
      render,
      className,
      style: _style,
      hiddenUntilFound: _hiddenUntilFound,
      keepMounted: _keepMounted,
      id: _id,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = panelState.value;
    const stateAttributes = getStateAttributesProps(stateValue, accordionStateAttributesMapping);

    const resolvedStyle = resolveStyle(componentProps.style, stateValue);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      panelProps(),
      {
        'aria-labelledby': triggerId.value,
        role: 'region',
        className: typeof className === 'function' ? className(stateValue) : className,
        style: {
          [AccordionPanelCssVars.accordionPanelHeight as string]:
            height.value === undefined ? 'auto' : `${height.value}px`,
          [AccordionPanelCssVars.accordionPanelWidth as string]:
            width.value === undefined ? 'auto' : `${width.value}px`,
        },
      },
      resolvedStyle ? (prev: HTMLProps) => ({ ...prev, style: resolvedStyle }) : undefined,
      shouldPreventOpenAnimation.value
        ? (prev: HTMLProps) => ({ ...prev, style: { animationName: 'none' } })
        : undefined,
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={ref} />;
    }
    return <div ref={ref} {...merged} />;
  };
}) as (props: AccordionPanel.Props) => any;

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