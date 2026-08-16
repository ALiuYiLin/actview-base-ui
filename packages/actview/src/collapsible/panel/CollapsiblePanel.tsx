import { computed, watch } from 'actview';
import { warn } from '@base-ui/actview-utils/warn';
import { BaseUIComponentProps } from '../../internals/types';
import { resolveStyle } from '../../utils/resolveStyle';
import { useRenderElement } from '../../internals/useRenderElement';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import type { CollapsibleRootState } from '../root/CollapsibleRoot';
import { collapsibleStateAttributesMapping } from '../root/stateAttributesMapping';
import { useCollapsiblePanel } from './useCollapsiblePanel';
import { CollapsiblePanelCssVars } from './CollapsiblePanelCssVars';
import type { TransitionStatus } from '../../internals/useTransitionStatus';

/**
 * A panel with the collapsible contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsiblePanel(componentProps: CollapsiblePanel.Props) {
  const context = useCollapsibleRootContext();

  const hiddenUntilFound = computed(() => componentProps.hiddenUntilFound ?? false);
  const keepMounted = computed(() => componentProps.keepMounted ?? false);
  const registeredId = computed(() => componentProps.id || undefined);
  const id = computed(() => registeredId.value ?? context.value.defaultPanelId);

  /* istanbul ignore else -- `process.env.NODE_ENV` is a build-time constant under test */
  if (process.env.NODE_ENV !== 'production') {
    watch(
      [() => componentProps.hiddenUntilFound, () => componentProps.keepMounted],
      ([hiddenUntilFoundProp, keepMountedProp]) => {
        if (hiddenUntilFoundProp && keepMountedProp === false) {
          warn(
            'The `keepMounted={false}` prop on `Collapsible.Panel` is ignored when `hiddenUntilFound` is enabled, since the panel must remain mounted while closed.',
          );
        }
      },
    );
  }

  watch(
    registeredId,
    (regId, _old, onCleanup) => {
      context.value.setPanelIdState((currentId) =>
        regId ?? (currentId === null ? undefined : currentId),
      );
      onCleanup(() => {
        context.value.setPanelIdState((currentId) => (currentId === regId ? null : currentId));
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
    mounted: () => context.value.mounted,
    onOpenChange: context.value.onOpenChange,
    open: () => context.value.open,
    setMounted: context.value.setMounted,
    setOpen: context.value.setOpen,
    transitionStatus: () => context.value.transitionStatus,
  });

  const panelState = computed<CollapsiblePanelState>(() => ({
    ...context.value.state,
    transitionStatus: panelTransitionStatus.value,
  }));

  const resolvedStyle = computed(() => resolveStyle(componentProps.style, panelState.value));

  const getElementProps = () => {
    const {
      className: _className,
      hiddenUntilFound: _hiddenUntilFound,
      keepMounted: _keepMounted,
      render: _render,
      id: _id,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

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
      () => ({
        style: {
          [CollapsiblePanelCssVars.collapsiblePanelHeight as string]:
            height.value === undefined ? 'auto' : `${height.value}px`,
          [CollapsiblePanelCssVars.collapsiblePanelWidth as string]:
            width.value === undefined ? 'auto' : `${width.value}px`,
        },
      }),
      getElementProps,
      () => (resolvedStyle.value ? { style: resolvedStyle.value } : undefined),
      // Resolve the public `style` prop so temporary `animationName: 'none'`
      // can still win after user's inline styles have been merged.
      () =>
        shouldPreventOpenAnimation.value ? { style: { animationName: 'none' } } : undefined,
    ],
    stateAttributesMapping: collapsibleStateAttributesMapping,
  });

  return shouldRender.value ? <>{getElement()}</> : null;
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
