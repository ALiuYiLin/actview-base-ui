import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';
import type { ImageLoadingStatus } from './AvatarRoot';

export interface AvatarRootContext {
  imageLoadingStatus: ImageLoadingStatus;
  setImageLoadingStatus: (status: ImageLoadingStatus) => void;
}

export const AvatarRootContext = createContext<AvatarRootContext | undefined>(
  'base-ui-avatar-root-context',
  undefined,
);

export function useAvatarRootContext() {
  const context = AvatarRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>.',
    );
  }
  return context as ComputedRef<AvatarRootContext>;
}
