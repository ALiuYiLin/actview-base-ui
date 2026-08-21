import { computed, defineComponent, onUnmounted, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState, ImageLoadingStatus } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '../../internals/useTransitionStatus';
import { useImageLoadingStatus } from './useImageLoadingStatus';
import { mergePropsN } from '../../merge-props';

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
export const AvatarImage = defineComponent(function (componentProps: AvatarImage.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const context = useAvatarRootContext();
  const setImageLoadingStatus = context.value.setImageLoadingStatus;

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

  watch(
    imageLoadingStatus,
    (status) => {
      if (status !== 'idle') {
        componentProps.onLoadingStatusChange?.(status);
        setImageLoadingStatus(status);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    setImageLoadingStatus('idle');
  });

  useOpenChangeComplete({
    open: isVisible,
    ref: rootRef,
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

  // ================= render（每次更新执行） =================
  return () => {
    if (!mounted.value) {
      return null;
    }

    const {
      render,
      className,
      style,
      onLoadingStatusChange: _onLoadingStatusChange,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <img ref={rootRef} {...merged} />;
  };
}) as (props: AvatarImage.Props) => any;

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