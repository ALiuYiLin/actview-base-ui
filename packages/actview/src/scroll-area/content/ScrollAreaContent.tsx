import { computed } from 'actview';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useScrollAreaViewportContext } from '../viewport/ScrollAreaViewportContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import type { ScrollAreaRootState } from '../root/ScrollAreaRoot';

/**
 * A container for the content of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaContent(componentProps: ScrollAreaContent.Props) {
  const viewportContext = useScrollAreaViewportContext();
  const root = useScrollAreaRootContext();

  const contentWrapperRef = { current: null as HTMLDivElement | null };
  const computeOnInitialResizeRef = { current: root.value.hasMeasuredScrollbar };

  useIsoLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    let hasInitialized = false;
    const resizeObserver = new ResizeObserver(() => {
      if (!hasInitialized) {
        hasInitialized = true;

        // ResizeObserver fires once upon observing. Skip that initial call to avoid
        // double-calculating the thumb position on mount, unless the content mounted
        // after the viewport's initial measurement (in which case this fire is what
        // brings the overflow state in sync).
        if (!computeOnInitialResizeRef.current) {
          return;
        }
      }

      viewportContext.value.computeThumbPosition();
    });

    if (contentWrapperRef.current) {
      resizeObserver.observe(contentWrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  });

  const state = computed<ScrollAreaRootState>(() => root.value.viewportState);

  const getContentProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    role: 'presentation',
    style: {
      minWidth: 'fit-content',
    },
  });

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      className: _className,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, contentWrapperRef],
    state,
    stateAttributesMapping: scrollAreaStateAttributesMapping,
    props: [getContentProps, getElementProps],
  });

  return <>{getElement()}</>;
}

export interface ScrollAreaContentState extends ScrollAreaRootState {}

export interface ScrollAreaContentProps extends BaseUIComponentProps<
  'div',
  ScrollAreaContentState
> {}

export namespace ScrollAreaContent {
  export type State = ScrollAreaContentState;
  export type Props = ScrollAreaContentProps;
}
