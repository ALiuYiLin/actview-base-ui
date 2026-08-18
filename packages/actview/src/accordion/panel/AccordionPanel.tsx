import { computed, watch } from 'actview';
import { warn } from '@base-ui/actview-utils/warn';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { resolveStyle } from '../../utils/resolveStyle';
import { useCollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import { useCollapsiblePanel } from '../../collapsible/panel/useCollapsiblePanel';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import type { AccordionRoot } from '../root/AccordionRoot';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import { AccordionPanelCssVars } from './AccordionPanelCssVars';
import { useRenderElement } from '../../internals/useRenderElement';
import type { TransitionStatus } from '../../internals/useTransitionStatus';

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionPanel(componentProps: AccordionPanel.Props) {
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
    props,
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

  const resolvedStyle = computed(() => resolveStyle(componentProps.style, panelState.value));

  const triggerId = computed(() => itemContext.value.triggerId);

  function getElementProps(prev: HTMLProps): HTMLProps {
    const {
      render: _render,
      className: _className,
      hiddenUntilFound: _hiddenUntilFound,
      keepMounted: _keepMounted,
      id: _id,
      style: _style,
      ...elementProps
    } = componentProps;
    // Keep the id managed by `useCollapsiblePanel` (via `props`), drop the prop copy.
    return { ...prev, ...elementProps };
  }

  // Pass `style: undefined` to `useRenderElement` so it does not re-apply the public
  // `style` after the props list below; `resolvedStyle` (resolved against the panel
  // state) and the temporary `animationName: 'none'` must keep their merge order.
  const renderComponentProps = {
    get render() {
      return componentProps.render;
    },
    get className() {
      return componentProps.className;
    },
    style: undefined,
  };

  const getElement = useRenderElement('div', renderComponentProps, {
    state: panelState,
    ref,
    props: [
      props,
      // Getter (not a static object): props must be re-evaluated on every render,
      // otherwise `height`/`width`/`triggerId` are frozen at setup time (AD-17).
      // Merge with `prev` (which carries `id`, `hidden`, data-* from `props`) since
      // getters replace the accumulated props wholesale (AD-20).
      (prev: HTMLProps) => ({
        ...prev,
        'aria-labelledby': triggerId.value,
        role: 'region',
        style: {
          [AccordionPanelCssVars.accordionPanelHeight as string]:
            height.value === undefined ? 'auto' : `${height.value}px`,
          [AccordionPanelCssVars.accordionPanelWidth as string]:
            width.value === undefined ? 'auto' : `${width.value}px`,
        },
      }),
      getElementProps,
      (prev: HTMLProps) =>
        resolvedStyle.value ? { ...prev, style: resolvedStyle.value } : prev,
      // Resolve the public `style` prop so temporary `animationName: 'none'`
      // can still win after user's inline styles have been merged.
      (prev: HTMLProps) =>
        shouldPreventOpenAnimation.value
          ? { ...prev, style: { animationName: 'none' } }
          : prev,
    ],
    stateAttributesMapping: accordionStateAttributesMapping,
  });

  return shouldRender.value ? <>{getElement()}</> : null;
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
