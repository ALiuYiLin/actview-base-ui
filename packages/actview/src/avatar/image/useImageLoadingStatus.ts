import { ref, unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import type { MaybeRef } from '../../internals/types';
import type { ImageLoadingStatus } from '../root/AvatarRoot';

interface UseImageLoadingStatusOptions {
  referrerPolicy?: MaybeRef<string | undefined>;
  crossOrigin?: MaybeRef<string | null | undefined>;
  sizes?: MaybeRef<string | undefined>;
  srcSet?: MaybeRef<string | undefined>;
}

export function useImageLoadingStatus(
  src: MaybeRef<string | undefined>,
  { referrerPolicy, crossOrigin, sizes, srcSet }: UseImageLoadingStatusOptions,
): Ref<ImageLoadingStatus> {
  const loadingStatus = ref<ImageLoadingStatus>('idle');

  watch(
    [
      () => unref(src),
      () => unref(srcSet),
      () => unref(sizes),
      () => unref(crossOrigin),
      () => unref(referrerPolicy),
    ],
    ([srcValue, srcSetValue, sizesValue, crossOriginValue, referrerPolicyValue], _old, onCleanup) => {
      if (!srcValue && !srcSetValue) {
        loadingStatus.value = 'error';
        return;
      }

      let isMounted = true;
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
      if (referrerPolicyValue) {
        image.referrerPolicy = referrerPolicyValue;
      }
      image.crossOrigin = crossOriginValue ?? null;
      if (sizesValue) {
        image.sizes = sizesValue;
      }
      if (srcSetValue) {
        image.srcset = srcSetValue;
      }
      if (srcValue) {
        image.src = srcValue;
      }

      // Fast path for cached/decoded images
      if (image.complete) {
        loadingStatus.value = image.naturalWidth > 0 ? 'loaded' : 'error';
      }

      onCleanup(() => {
        isMounted = false;
      });
    },
    { immediate: true },
  );

  return loadingStatus;
}
