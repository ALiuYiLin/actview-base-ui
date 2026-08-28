import { reactive, toRefs, unrefs } from 'actview';
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
  // context 载体：reactive 对象 + 统一写入口（方法内自引用载体自身，
  // 读走 get 陷阱 track、写走 set 陷阱 trigger——Ref 本体不入载体）。
  const contextValue = reactive<AvatarRootContext>({
    imageLoadingStatus: 'idle' as ImageLoadingStatus,
    setImageLoadingStatus(status: ImageLoadingStatus) {
      contextValue.imageLoadingStatus = status;
    },
  });

  // ============ setup：值形 props toRefs 活引用；ref 形 props 直读本體 ============
  const { className, render, style, ...elementProps } = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 字面 JSX 是插件判定的锚；useRenderElement 调用在 JSX 内逐渲染求值。
  // state 字面量逐渲染重建（读 reactive 字段即追踪）；children 留在
  // elementProps 里随 props 流入渲染元素。
  return (
    <AvatarRootContext.Provider value={contextValue}>
      {useRenderElement(
        'span',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: { imageLoadingStatus: contextValue.imageLoadingStatus },
          stateAttributesMapping: avatarStateAttributesMapping,
          ref: componentProps.ref,
          props: [unrefs(elementProps)],
        },
      )}
    </AvatarRootContext.Provider>
  );
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
