import { computed, defineComponent, ref, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { AvatarRootContext } from './AvatarRootContext';
import { avatarStateAttributesMapping } from './stateAttributesMapping';
import { mergePropsN } from '../../merge-props';

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export const AvatarRoot = defineComponent(function (componentProps: AvatarRoot.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

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

  // ================= render（每次更新执行） =================
  return () => {
    const { render, className, style, ref: _ref, ...elementProps } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, avatarStateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态 + Provider 包裹（context 必须始终包裹子件）
    if (typeof render === 'function') {
      return (
        <AvatarRootContext.Provider value={contextValue}>
          {render({ ...merged, ...stateValue, ref: rootRef })}
        </AvatarRootContext.Provider>
      );
    }
    if (render) {
      const Tag = render.type as any;
      return (
        <AvatarRootContext.Provider value={contextValue}>
          <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />
        </AvatarRootContext.Provider>
      );
    }
    return (
      <AvatarRootContext.Provider value={contextValue}>
        <span ref={rootRef} {...merged} />
      </AvatarRootContext.Provider>
    );
  };
}) as (props: AvatarRoot.Props) => any;

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