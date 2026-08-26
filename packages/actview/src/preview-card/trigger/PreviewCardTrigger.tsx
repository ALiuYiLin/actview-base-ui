import { ref, toRefs, toValue, unrefs } from 'actview';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { PreviewCardHandle } from '../store/PreviewCardHandle';
import { useHoverReferenceInteraction, useFocus } from '@/floating-ui-react';
import { useButton } from '@/internals/use-button/useButton';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * An element to attach the preview-card to.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI PreviewCard](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardTrigger(componentProps: PreviewCardTrigger.Props) {
  const {disabled = false, nativeButton = true, handle} = componentProps as any;

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

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ref: refProp, ...elementProps} = toRefs(
    componentProps,
  );

  const {element} = useRenderElement({
    props: () => {
      // componentProps 原样参与合并（保持原 propsList 语义——hover/focus
      // 处理器、id、getButtonProps 依次覆盖）
      const merged: any = mergePropsN([
        hoverProps ?? {},
        focusProps ?? {},
        {id: thisTriggerId},
        componentProps as any,
        getButtonProps,
      ]);
      const openAttr = triggerOpenStateMapping.open(isOpenedByThisTrigger.value);
      if (openAttr) {
        Object.assign(merged, openAttr);
      }
      if (disabled) {
        merged['data-disabled'] = '';
      } else {
        delete merged['data-disabled'];
      }
      // className/style 由 hook 选项统一处理——从 merged 剔除避免重复
      delete merged.className;
      delete merged.style;
      return [merged];
    },
    className,
    style,
    render,
    refs: () => [triggerElementRef as any, buttonRef as any, refProp as any],
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

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
