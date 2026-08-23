import { onUnmounted, ref, toValue, watch } from 'actview';
import type { Ref } from 'actview';
import type { MaybeRefOrGetter } from '@/internals/types';
import { NOOP } from '@/internals/noop';
import type { ImageLoadingStatus } from '../root/AvatarRoot';

interface UseImageLoadingStatusOptions {
  referrerPolicy?: MaybeRefOrGetter<string | undefined>;
  crossOrigin?: MaybeRefOrGetter<string | undefined>;
  sizes?: MaybeRefOrGetter<string | undefined>;
  srcSet?: MaybeRefOrGetter<string | undefined>;
}

/**
 * Tracks the loading status of an image.
 * (actview 转译版：React useState + useIsoLayoutEffect → ref + watch。
 * 初始逻辑放 setup 直接执行——actview watch 的 immediate 首次回调在
 * 首次值为 undefined 时不触发（hasChanged 守卫）。)
 */
export function useImageLoadingStatus(
  src: MaybeRefOrGetter<string | undefined>,
  {referrerPolicy, crossOrigin, sizes, srcSet}: UseImageLoadingStatusOptions,
): Ref<ImageLoadingStatus> {
  const loadingStatus = ref<ImageLoadingStatus>('idle');
  let isMounted = true;

  const startLoading = () => {
    if (!toValue(src) && !toValue(srcSet)) {
      loadingStatus.value = 'error';
      return;
    }

    const image = new window.Image();

    const updateStatus = (status: ImageLoadingStatus) => () => {
      if (!isMounted) {
        return;
      }

      loadingStatus.value = status;
    };

    loadingStatus.value = 'loading';
    image.onload = updateStatus('loaded');
    image.onerror = updateStatus('error');
    if (toValue(referrerPolicy)) {
      image.referrerPolicy = toValue(referrerPolicy)!;
    }
    image.crossOrigin = toValue(crossOrigin) ?? null;
    if (toValue(sizes)) {
      image.sizes = toValue(sizes)!;
    }
    if (toValue(srcSet)) {
      image.srcset = toValue(srcSet)!;
    }
    if (toValue(src)) {
      image.src = toValue(src)!;
    }

    // Fast path for cached/decoded images
    if (image.complete) {
      loadingStatus.value = image.naturalWidth > 0 ? 'loaded' : 'error';
    }
  };

  // 初始执行（对齐 React useEffect 首次）
  startLoading();

  watch(
    () => [toValue(src), toValue(srcSet), toValue(sizes), toValue(crossOrigin), toValue(referrerPolicy)],
    () => {
      startLoading();
    },
  );

  onUnmounted(() => {
    isMounted = false;
  });

  return loadingStatus;
}

export { NOOP };
