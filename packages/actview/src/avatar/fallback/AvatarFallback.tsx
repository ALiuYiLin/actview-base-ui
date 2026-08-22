import { computed, defineComponent, ref, useRootElement, watch } from 'actview';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import type { BaseUIComponentProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useAvatarRootContext } from '@/avatar/root/AvatarRootContext';
import type { AvatarRootState } from '@/avatar/root/AvatarRoot';
import { avatarStateAttributesMapping } from '@/avatar/root/stateAttributesMapping';
import { mergePropsN } from '@/merge-props';

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export const AvatarFallback = defineComponent(function (componentProps: AvatarFallback.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

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

  const enabled = computed(
    () =>
      context.value.imageLoadingStatus !== 'loaded' &&
      ((componentProps.delay ?? 0) === 0 || delayPassed.value),
  );

  // ================= render（每次更新执行） =================
  return () => {
    if (!enabled.value) {
      return null;
    }

    const { render, className, delay: _delay, style, ref: _ref, ...elementProps } = componentProps;

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

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <span ref={rootRef} {...merged} />;
  };
}) as (props: AvatarFallback.Props) => any;

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