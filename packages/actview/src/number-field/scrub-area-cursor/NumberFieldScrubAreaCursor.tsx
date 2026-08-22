import { Teleport, computed } from 'actview';
import { platform } from '@base-ui/actview-utils/platform';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useNumberFieldRootContext } from '@/number-field/root/NumberFieldRootContext';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { NumberFieldRootState } from '@/number-field/root/NumberFieldRoot';
import { stateAttributesMapping } from '@/number-field/utils/stateAttributesMapping';
import { useNumberFieldScrubAreaContext } from '@/number-field/scrub-area/NumberFieldScrubAreaContext';
import { useRenderElement } from '@/internals/useRenderElement';

const CURSOR_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  pointerEvents: 'none',
} as const;

/**
 * A custom element to display instead of the native cursor while using the scrub area.
 * Renders a `<span>` element.
 *
 * This component uses the [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API), which may prompt the browser to display a related notification. It is disabled
 * in Safari to avoid a layout shift that this notification causes there.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldScrubAreaCursor(componentProps: NumberFieldScrubAreaCursor.Props) {
  const rootContext = useNumberFieldRootContext();
  const scrubAreaContext = useNumberFieldScrubAreaContext();

  const state = computed(() => rootContext.value.state);

  const domElementRef: { current: Element | null } = { current: null };

  const shouldRender = computed(
    () =>
      scrubAreaContext.value.isScrubbing &&
      !platform.engine.webkit &&
      !scrubAreaContext.value.isTouchInput &&
      !scrubAreaContext.value.isPointerLockDenied,
  );

  function getElementProps(prev: HTMLProps): HTMLProps {
    const { render: _render, className: _className, style: _style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  }

  const getElement = useRenderElement('span', componentProps, {
    ref: [
      componentProps.ref,
      scrubAreaContext.value.scrubAreaCursorRef,
      (node: HTMLSpanElement | null) => {
        domElementRef.current = node;
      },
    ],
    state,
    props: [
      {
        role: 'presentation',
        style: CURSOR_STYLE,
      },
      getElementProps,
    ],
    stateAttributesMapping,
  });

  // Conditionally render the portal (actview's equivalent of `ReactDOM.createPortal`). The
  // cursor is only shown while actively scrubbing with a mouse pointer.
  return shouldRender.value ? (
    <Teleport to={ownerDocument(domElementRef.current).body}>{getElement()}</Teleport>
  ) : null;
}

export interface NumberFieldScrubAreaCursorState extends NumberFieldRootState {}

export interface NumberFieldScrubAreaCursorProps extends BaseUIComponentProps<
  'span',
  NumberFieldScrubAreaCursorState
> {}

export namespace NumberFieldScrubAreaCursor {
  export type State = NumberFieldScrubAreaCursorState;
  export type Props = NumberFieldScrubAreaCursorProps;
}
