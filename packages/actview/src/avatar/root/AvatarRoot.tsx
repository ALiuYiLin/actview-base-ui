import { computed, ref } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { AvatarRootContext } from './AvatarRootContext';
import { avatarStateAttributesMapping } from './stateAttributesMapping';

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarRoot(componentProps: AvatarRoot.Props) {
  const imageLoadingStatus = ref<ImageLoadingStatus>('idle');
  const setImageLoadingStatus = (status: ImageLoadingStatus) => {
    imageLoadingStatus.value = status;
  };

  const state = computed<AvatarRootState>(() => ({
    imageLoadingStatus: imageLoadingStatus.value,
  }));

  const contextValue = computed<AvatarRootContext>(() => ({
    imageLoadingStatus: imageLoadingStatus.value,
    setImageLoadingStatus,
  }));

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { className, render, style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: componentProps.ref,
    props: [getElementProps],
    stateAttributesMapping: avatarStateAttributesMapping,
  });

  return <AvatarRootContext.Provider value={contextValue}>{getElement()}</AvatarRootContext.Provider>;
}

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AvatarRootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface AvatarRootProps extends BaseUIComponentProps<'span', AvatarRootState> {}

export namespace AvatarRoot {
  export type State = AvatarRootState;
  export type Props = AvatarRootProps;
}
