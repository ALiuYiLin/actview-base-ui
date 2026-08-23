import { defineComponent, ref, toValue } from 'actview';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { PreviewCardHandle } from '../store/PreviewCardHandle';
import { useHoverReferenceInteraction, useFocus } from '@/floating-ui-react';
import { useButton } from '@/internals/use-button/useButton';

/**
 * An element to attach the preview-card to.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI PreviewCard](https://base-ui.com/react/components/preview-card)
 */
export const PreviewCardTrigger = defineComponent(function PreviewCardTrigger(
  componentProps: PreviewCardTrigger.Props,
) {
  const {disabled = false, nativeButton = true, handle} = componentProps as any;
  const children = toValue(componentProps.children);

  const previewCardHandleStore = usePopupHandleStore(handle as any);
  const handleStore = previewCardHandleStore.value;
  const rootStore = usePreviewCardRootContext(true);

  const store: any = handleStore ?? rootStore;

  if (store === undefined) {
    throw new Error(
      'Base UI: <PreviewCard.Trigger> must be either used within a <PreviewCard.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId((componentProps as any).id);
  const triggerElementRef = ref<HTMLElement | null>(null);

  const {registerTrigger, isMountedByThisTrigger} = useTriggerDataForwarding(
    thisTriggerId as any,
    triggerElementRef as any,
    store,
    {
      payload: (componentProps as any).payload,
      disabled,
      closeDelay: (componentProps as any).closeDelay,
    } as any,
  );

  const floatingContext = store.useState('floatingRootContext');
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId as any);

  const hoverProps = useHoverReferenceInteraction(floatingContext.value, {
    enabled: !disabled,
    mouseOnly: true,
    move: false,
    triggerElementRef: triggerElementRef as any,
    isActiveTrigger: isOpenedByThisTrigger.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
  });

  const focusProps = useFocus(floatingContext.value, {enabled: !disabled}).reference;

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton,
  });

  const propsList = [
    hoverProps ?? {},
    focusProps ?? {},
    {
      id: thisTriggerId,
    },
    componentProps,
    getButtonProps,
  ];

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const merged: any = mergePropsN<any>([...propsList]);
    const openAttr = triggerOpenStateMapping.open(isOpenedByThisTrigger.value);
    if (openAttr) {
      Object.assign(merged, openAttr);
    }
    if (disabled) {
      merged['data-disabled'] = '';
    } else {
      delete merged['data-disabled'];
    }

    const mergedRefs = (el: HTMLElement | null) => {
      triggerElementRef.value = el;
      if (typeof buttonRef === 'function') {
        (buttonRef as any)(el);
      } else if (buttonRef) {
        (buttonRef as any).value = el;
      }
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        (componentProps.ref as any).current = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref: mergedRefs} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return (
      <button {...merged} className={className} ref={mergedRefs}>
        {children}
      </button>
    );
  };
});

export interface PreviewCardTriggerState {
  /**
   * Whether the preview-card is currently open.
   */
  open: boolean;
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
}

export interface PreviewCardTriggerProps extends BaseUIComponentProps<'button', PreviewCardTriggerState> {
  children?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * The payload of the trigger.
   */
  payload?: unknown;
  [key: string]: any;
}

export namespace PreviewCardTrigger {
  export type State = PreviewCardTriggerState;
  export type Props = PreviewCardTriggerProps;
}
