import { computed, defineComponent, watch } from 'actview';
import { warn } from '@base-ui/actview-utils/warn';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { resolveStyle } from '../../utils/resolveStyle';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import type { CollapsibleRootState } from '../root/CollapsibleRoot';
import { collapsibleStateAttributesMapping } from '../root/stateAttributesMapping';
import { useCollapsiblePanel } from './useCollapsiblePanel';
import { CollapsiblePanelCssVars } from './CollapsiblePanelCssVars';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { mergePropsN } from '../../merge-props';

/**
 * A panel with the collapsible contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export const CollapsiblePanel = defineComponent(function (componentProps: CollapsiblePanel.Props) {
  // ================= setup（只执行一次） =================
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
    const stateAttributes = getStateAttributesProps(stateValue, collapsibleStateAttributesMapping);

    const resolvedStyle = resolveStyle(componentProps.style, stateValue);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      panelProps(),
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: {
          [CollapsiblePanelCssVars.collapsiblePanelHeight as string]:
            height.value === undefined ? 'auto' : `${height.value}px`,
          [CollapsiblePanelCssVars.collapsiblePanelWidth as string]:
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
}) as (props: CollapsiblePanel.Props) => any;

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