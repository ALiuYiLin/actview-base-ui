import { createContext } from 'actview';
import type { Reactive } from '@/internals/types';
import type { ImageLoadingStatus } from './AvatarRoot';

export interface AvatarRootContext {
  /** 原始值字段：reactive 载体读走 get 陷阱 track、写走 set 陷阱 trigger */
  imageLoadingStatus: ImageLoadingStatus;
  /** 统一写入口（软约束）：所有变更走此方法，调试时改值来源一目了然 */
  setImageLoadingStatus: (status: ImageLoadingStatus) => void;
}

/**
 * store-as-is 契约：payload 用 reactive 载体（原始值字段 + 统一写入口），
 * use() 原样返回载体——消费端读 `ctx.imageLoadingStatus` 即建立追踪。
 * ⚠️ 不要在 reactive 载体里存 ref 本体（reactive get 陷阱不自动解包 ref），
 * 也不要对 use() 结果再读 .value（1.3 起无包装）。
 */
export const AvatarRootContext = createContext<Reactive<AvatarRootContext> | undefined>(
  undefined,
);

/**
 * Consumer hook：setup 顶层调用，返回 reactive 载体（render 里直接读字段）。
 * Throws when no `<Avatar.Root>` provides the context.
 */
export function useAvatarRootContext(): Reactive<AvatarRootContext> {
  const context = AvatarRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>.',
    );
  }
  return context;
}
