export { AvatarRoot as Root } from './root/AvatarRoot';
// AvatarImage 依赖 useTransitionStatus 家族（尚未迁移）——迁移后恢复
// export { AvatarImage as Image } from './image/AvatarImage';
export { AvatarFallback as Fallback } from './fallback/AvatarFallback';

export type * from './root/AvatarRoot';
export type * from './fallback/AvatarFallback';
