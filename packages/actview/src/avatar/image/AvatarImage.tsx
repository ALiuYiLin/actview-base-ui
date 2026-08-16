import { computed, onUnmounted, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState, ImageLoadingStatus } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '../../internals/useTransitionStatus';
import { useImageLoadingStatus } from './useImageLoadingStatus';

const stateAttributesMapping: StateAttributesMapping<AvatarImageState> = {
  ...avatarStateAttributesMapping,
  ...transitionStatusMapping,
};

/**
 * The image to be displayed in the avatar.
 * Renders an `<img>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarImage(componentProps: AvatarImage.Props) {
  const context = useAvatarRootContext();
  const setImageLoadingStatus = context.value.setImageLoadingStatus;

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { className, render, onLoadingStatusChange, style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const imageLoadingStatus = useImageLoadingStatus(
    computed(() => componentProps.src),
    {
      referrerPolicy: computed(() => componentProps.referrerPolicy),
      crossOrigin: computed(() => componentProps.crossOrigin),
      sizes: computed(() => componentProps.sizes),
      srcSet: computed(() => componentProps.srcSet),
    },
  );

  const isVisible = computed(() => imageLoadingStatus.value === 'loaded');

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(isVisible);

  const imageRef = { current: null as HTMLImageElement | null };

  const handleLoadingStatusChange = (status: ImageLoadingStatus) => {
    componentProps.onLoadingStatusChange?.(status);
    setImageLoadingStatus(status);
  };

  watch(
    () => imageLoadingStatus.value,
    (status) => {
      if (status !== 'idle') {
        handleLoadingStatusChange(status);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    setImageLoadingStatus('idle');
  });

  useOpenChangeComplete({
    open: isVisible,
    ref: imageRef,
    onComplete() {
      if (!isVisible.value) {
        setMounted(false);
      }
    },
  });

  const state = computed<AvatarImageState>(() => ({
    imageLoadingStatus: imageLoadingStatus.value,
    transitionStatus: transitionStatus.value,
  }));

  const getElement = useRenderElement('img', componentProps, {
    state,
    ref: [componentProps.ref, imageRef],
    props: [getElementProps],
    stateAttributesMapping,
  });

  return <>{mounted.value ? getElement() : null}</>;
}

export interface AvatarImageState extends AvatarRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface AvatarImageProps
  extends BaseUIComponentProps<'img', AvatarImageState, JSX.IntrinsicElements['img']> {
  /**
   * How the element handles cross-origin requests.
   */
  crossOrigin?: string | undefined;
  /**
   * The referrer policy to use when fetching the image.
   */
  referrerPolicy?: string | undefined;
  /**
   * A list of source sizes that describe the final rendered width of the image.
   */
  sizes?: string | undefined;
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: ((status: ImageLoadingStatus) => void) | undefined;
}

export namespace AvatarImage {
  export type State = AvatarImageState;
  export type Props = AvatarImageProps;
}
