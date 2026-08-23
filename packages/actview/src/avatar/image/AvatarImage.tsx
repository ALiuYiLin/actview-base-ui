import { computed, defineComponent, onUnmounted, ref, toValue, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps, type StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState, ImageLoadingStatus } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import { useImageLoadingStatus } from './useImageLoadingStatus';
import { mergeClassNames, mergeStyles } from '@/utils/mergeClassNames';

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
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();
  const {setImageLoadingStatus} = toValue(useAvatarRootContext());
  const imageLoadingStatus = useImageLoadingStatus(() => toValue(componentProps.src), {
    referrerPolicy: () => toValue(componentProps.referrerPolicy),
    crossOrigin: () => toValue(componentProps.crossOrigin),
    sizes: () => toValue(componentProps.sizes),
    srcSet: () => toValue(componentProps.srcSet),
  });

  const isVisible = computed(() => imageLoadingStatus.value === 'loaded');
  const {mounted, transitionStatus, setMounted} = useTransitionStatus(isVisible);

  const imageRef = ref<HTMLImageElement | null>(null);

  // rootRef 转发到 imageRef（useOpenChangeComplete 需要元素 ref；actview JSX
  // ref 只能绑定一个——watch rootRef 同步，同 Button 的 buttonRef 模式）
  watch(
    rootRef,
    (el) => {
      imageRef.value = el as HTMLImageElement | null;
    },
    {flush: 'post', immediate: true},
  );

  // imageLoadingStatus 变化 → onLoadingStatusChange + 同步 Root 状态
  watch(
    () => imageLoadingStatus.value,
    (status) => {
      if (status !== 'idle') {
        componentProps.onLoadingStatusChange?.(status);
        setImageLoadingStatus(status);
      }
    },
    {immediate: true},
  );

  // React useIsoLayoutEffect cleanup：卸载时重置 Root 状态
  onUnmounted(() => {
    setImageLoadingStatus('idle');
  });

  useOpenChangeComplete({
    open: isVisible,
    ref: imageRef,
    onComplete: () => {
      if (!isVisible.value) {
        setMounted(false);
      }
    },
  });

  // ============ render（每次渲染执行） ============
  return () => {
    if (!mounted.value) {
      return null;
    }

    const {
      className,
      render,
      onLoadingStatusChange: _onLoadingStatusChange,
      style,
      ...elementProps
    } = componentProps;

    const state: AvatarImageState = {
      imageLoadingStatus: imageLoadingStatus.value,
      transitionStatus: transitionStatus.value,
    };

    const stateAttributes = getStateAttributesProps(state, stateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(state);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(state);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className = mergeClassNames(merged.className, renderClassName);
      mergedRenderProps.style = mergeStyles(merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <img {...merged} ref={rootRef} />;
  };
}) as unknown as (props: AvatarImage.Props) => JSX.Element;

export interface AvatarImageState extends AvatarRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

/**
 * 原生 `<img>` 专属属性（actview 的 HTMLAttributes 不含）——既作为组件
 * props，也并入 render prop 参数类型（React 版用 ComponentPropsWithRef<'img'>）。
 */
export interface AvatarImageElementProps {
  src?: string | undefined;
  alt?: string | undefined;
  crossOrigin?: string | undefined;
  referrerPolicy?: string | undefined;
  sizes?: string | undefined;
  srcSet?: string | undefined;
}

export interface AvatarImageProps
  extends BaseUIComponentProps<'img', AvatarImageState, HTMLProps & AvatarImageElementProps>,
    AvatarImageElementProps {
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: ((status: ImageLoadingStatus) => void) | undefined;
}

export namespace AvatarImage {
  export type State = AvatarImageState;
  export type Props = AvatarImageProps;
}
