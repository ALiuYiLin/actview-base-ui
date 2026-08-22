import { computed, watch } from 'actview';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import { FloatingFocusManager } from '@/floating-ui-actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useComboboxFloatingContext, useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { popupStateMapping } from '@/utils/popupStateMapping';
import { useComboboxPositionerContext } from '@/combobox/positioner/ComboboxPositionerContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { contains, getTarget } from '@/floating-ui-actview/utils';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { ComboboxInternalDismissButton } from '@/combobox/utils/ComboboxInternalDismissButton';
import { getComboboxPopupId } from '@/combobox/root/utils';
import { useListEmpty } from '@/combobox/utils/parts';

const stateAttributesMapping: StateAttributesMapping<ComboboxPopupState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * A container for the list.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxPopup(componentProps: ComboboxPopup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    initialFocus,
    finalFocus,
    ...elementProps
  } = componentProps;

  const store = useComboboxRootContext();
  const positioning = useComboboxPositionerContext();
  const floatingRootContext = useComboboxFloatingContext();

  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const popupProps = store.useState('popupProps');
  const transitionStatus = store.useState('transitionStatus');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const inputElement = store.useState('inputElement');
  const modal = store.useState('modal');
  const rootId = store.useState('id');

  const empty = useListEmpty();
  const popupId = computed(() =>
    elementProps.id ?? (inputInsidePopup.value ? getComboboxPopupId(rootId.value) : undefined),
  );

  // Prefer the rendered DOM id, which a `render` prop element or function may override.
  watch(
    [popupId],
    () => {
      store.set('popupId', store.state.popupRef.current?.id || popupId.value);
      return () => {
        store.set('popupId', undefined);
      };
    },
    { immediate: true },
  );

  useOpenChangeComplete({
    open,
    ref: store.state.popupRef,
    onComplete() {
      if (open.value) {
        store.state.onOpenChangeComplete(true);
      }
    },
  });

  const state = computed<ComboboxPopupState>(() => ({
    open: open.value,
    side: positioning.value.side.value,
    align: positioning.value.align.value,
    anchorHidden: positioning.value.anchorHidden.value,
    transitionStatus: transitionStatus.value,
    empty: empty.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, store.state.popupRef],
    props: [
      (prev: any) => ({ ...prev, ...popupProps.value }),
      {
        id: popupId.value,
        role: inputInsidePopup.value ? 'dialog' : 'presentation',
        onFocus(event: FocusEvent) {
          const target = getTarget(event) as Element | null;
          if (
            openMethod.value !== 'touch' &&
            (contains(store.state.listElement, target) || target === event.currentTarget)
          ) {
            store.state.inputRef.current?.focus();
          }
        },
      },
      (prev: any) => ({
        ...prev,
        ...getDisabledMountTransitionStyles(transitionStatus.value),
      }),
      elementProps,
    ],
    stateAttributesMapping,
  });

  // Default initial focus logic:
  // If opened by touch, focus the popup element to prevent the virtual keyboard from opening
  // (this is required for Android specifically as iOS handles this automatically).
  const computedDefaultInitialFocus = computed(() =>
    inputInsidePopup.value
      ? (interactionType: InteractionType) =>
          interactionType === 'touch' ? store.state.popupRef.current : inputElement.value
      : false,
  );

  const resolvedInitialFocus = computed(() =>
    initialFocus === undefined ? computedDefaultInitialFocus.value : initialFocus,
  );

  const resolvedFinalFocus = computed(() => {
    if (finalFocus != null) {
      return finalFocus;
    }
    return inputInsidePopup.value ? undefined : false;
  });

  const focusManagerModal = computed(() => !inputInsidePopup.value || modal.value);

  return (
    <>
      {mounted.value ? (
        <FloatingFocusManager
          context={floatingRootContext}
          disabled={false}
          modal={focusManagerModal.value}
          openInteractionType={openMethod.value}
          initialFocus={resolvedInitialFocus.value as any}
          returnFocus={resolvedFinalFocus.value as any}
          getInsideElements={() => [
            store.state.startDismissRef.current,
            store.state.endDismissRef.current,
          ]}
        >
          <fragment>
            {getElement()}
            {focusManagerModal.value && (
              <ComboboxInternalDismissButton ref={store.state.endDismissRef} />
            )}
          </fragment>
        </FloatingFocusManager>
      ) : (
        getElement()
      )}
    </>
  );
}

export interface ComboboxPopupState {
  /**
   * Whether the component is open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether there are no items to display.
   */
  empty: boolean;
}

export interface ComboboxPopupProps extends BaseUIComponentProps<'div', ComboboxPopupState> {
  /**
   * Determines the element to focus when the popup is opened.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or popup).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  initialFocus?:
    | boolean
    | { current: HTMLElement | null; value?: HTMLElement | null }
    | ((openType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
  /**
   * Determines the element to focus when the popup is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | { current: HTMLElement | null; value?: HTMLElement | null }
    | ((closeType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
}

export namespace ComboboxPopup {
  export type State = ComboboxPopupState;
  export type Props = ComboboxPopupProps;
}
