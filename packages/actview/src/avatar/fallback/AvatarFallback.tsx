import { computed, ref, watch } from 'actview';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarFallback(componentProps: AvatarFallback.Props) {
  const context = useAvatarRootContext();

  const delayPassed = ref((componentProps.delay ?? 0) === 0);
  const timeout = useTimeout();

  watch(
    () => componentProps.delay ?? 0,
    (delay) => {
      if (delay > 0) {
        timeout.start(delay, () => {
          delayPassed.value = true;
        });
      } else {
        // Once the fallback is shown without a delay, keep it visible. Otherwise a later
        // change from no delay to a number would re-hide an already-visible fallback.
        delayPassed.value = true;
      }
    },
    { immediate: true },
  );

  const state = computed<AvatarFallbackState>(() => ({
    imageLoadingStatus: context.value.imageLoadingStatus,
  }));

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { className, render, delay, style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: componentProps.ref,
    props: [getElementProps],
    stateAttributesMapping: avatarStateAttributesMapping,
  });

  const enabled = computed(
    () =>
      context.value.imageLoadingStatus !== 'loaded' &&
      ((componentProps.delay ?? 0) === 0 || delayPassed.value),
  );

  return <>{enabled.value ? getElement() : null}</>;
}

export interface AvatarFallbackState extends AvatarRootState {}

export interface AvatarFallbackProps extends BaseUIComponentProps<'span', AvatarFallbackState> {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   *
   * @default 0
   */
  delay?: number | undefined;
}

export namespace AvatarFallback {
  export type State = AvatarFallbackState;
  export type Props = AvatarFallbackProps;
}
