import { computed, onUnmounted, ref, toRefs, unrefs, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState, ImageLoadingStatus } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import { useImageLoadingStatus } from './useImageLoadingStatus';
import { useRenderElement } from '@/internals/useRenderElement';

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
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读字段即追踪，无 .value 链。
  const { setImageLoadingStatus } = useAvatarRootContext();
  const imageLoadingStatus = useImageLoadingStatus(() => componentProps.src, {
    referrerPolicy: () => componentProps.referrerPolicy,
    crossOrigin: () => componentProps.crossOrigin,
    sizes: () => componentProps.sizes,
    srcSet: () => componentProps.srcSet,
  });

  const isVisible = computed(() => imageLoadingStatus.value === 'loaded');
  const {mounted, transitionStatus, setMounted} = useTransitionStatus(isVisible);

  // 组件内部自持 ref：useOpenChangeComplete 需要元素 ref。
  // 与转发 props.ref 一起经 useRenderElement 的 ref 合并链（useMergedRefs）
  // 广播写入——替代旧的 rootRef→imageRef watch 桥接。
  const imageRef = ref<HTMLImageElement | null>(null);

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

  // ============ setup：值形 props toRefs 活引用；ref 形 props 直读本體 ============
  const { className, render, style, ...elementProps } = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件（mounted）在渲染期求值；getter 在 props 数组里逐渲染求值并消费 prev。
  return (
    <>
      {mounted.value
        ? useRenderElement(
            'img',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: {
                imageLoadingStatus: imageLoadingStatus.value,
                transitionStatus: transitionStatus.value,
              },
              ref: [componentProps.ref, imageRef],
              props: [
                (prev: any) => {
                  const {onLoadingStatusChange: _onLoadingStatusChange, ...rest} = unrefs(elementProps);
                  return {...prev, ...rest};
                },
              ],
            },
          )
        : null}
    </>
  );
}

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
