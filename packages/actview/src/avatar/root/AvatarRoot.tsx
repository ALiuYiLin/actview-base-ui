import { ref, toRefs, unrefs, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { AvatarRootContext } from './AvatarRootContext';
import { avatarStateAttributesMapping } from './stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarRoot(componentProps: AvatarRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<AvatarRootContext.Provider>`），无 Fragment 根问题。
  const rootRef = useRootElement();
  const imageLoadingStatus = ref<ImageLoadingStatus>('idle');

  const setImageLoadingStatus = (status: ImageLoadingStatus) => {
    imageLoadingStatus.value = status;
  };

  // 稳定引用（Provider watch value prop——对象本身不变，内部 Ref 响应式）
  const contextValue: AvatarRootContext = {
    imageLoadingStatus,
    setImageLoadingStatus,
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = (): AvatarRootState => ({
    imageLoadingStatus: imageLoadingStatus.value,
  });

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: stateFn,
    stateAttributesMapping: avatarStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <AvatarRootContext.Provider value={contextValue}>{element()}</AvatarRootContext.Provider>;
}

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AvatarRootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface AvatarRootProps extends BaseUIComponentProps<'span', AvatarRootState> {}

export namespace AvatarRoot {
  export type State = AvatarRootState;
  export type Props = AvatarRootProps;
}
