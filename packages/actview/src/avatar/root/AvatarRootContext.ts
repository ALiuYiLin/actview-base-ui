import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { ImageLoadingStatus } from './AvatarRoot';

export interface AvatarRootContext {
  imageLoadingStatus: Ref<ImageLoadingStatus>;
  setImageLoadingStatus: (status: ImageLoadingStatus) => void;
}

export const AvatarRootContext = createContext<AvatarRootContext | undefined>(undefined);

/**
 * Consumer hook（actview 范式）：setup 顶层调用，返回 Ref（render 读 .value）。
 * Throws when no `<Avatar.Root>` provides the context.
 */
export function useAvatarRootContext(): Ref<AvatarRootContext> {
  const context = AvatarRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>.',
    );
  }
  return context as Ref<AvatarRootContext>;
}
