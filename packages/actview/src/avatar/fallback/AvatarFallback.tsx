import { computed, ref, toRefs, watch } from 'actview';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarFallback(componentProps: AvatarFallback.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读 imageLoadingStatus 字段即追踪。
  const context = useAvatarRootContext();

  // delay：computed 渲染期实时（props 直读，无 toValue）。
  const delay = computed(() => componentProps.delay ?? 0);
  const delayPassed = ref(delay.value === 0);

  // React 版 useTimeout(delay)：delay > 0 时延时显示，否则立即显示。
  // 初始逻辑放 setup 直接执行（actview watch 的 immediate 首次回调在
  // 首次值为 undefined 时因 hasChanged 守卫不触发——见 core/watch.ts），
  // watch 只处理后续 prop 变化。
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const clearDelayTimeout = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const initialDelay = delay.value;
  if (initialDelay > 0) {
    timeoutId = setTimeout(() => {
      delayPassed.value = true;
    }, initialDelay);
  } else {
    // Once the fallback is shown without a delay, keep it visible. Otherwise a later
    // change from no delay to a number would re-hide an already-visible fallback.
    delayPassed.value = true;
  }

  watch(delay, (d) => {
    clearDelayTimeout();
    if (d > 0) {
      timeoutId = setTimeout(() => {
        delayPassed.value = true;
      }, d);
    } else {
      delayPassed.value = true;
    }
  });
  onUnmounted(clearDelayTimeout);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const state = computed<AvatarFallbackState>(() => ({
    imageLoadingStatus: context.imageLoadingStatus,
  }));
  const hidden = computed(
    () => state.value.imageLoadingStatus === 'loaded' || !(delay.value === 0 || delayPassed.value),
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {hidden.value
        ? null
        : useRenderElement(
            'span',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: state.value,
              ref: componentProps.ref,
              props: elementProps.value,
              stateAttributesMapping: avatarStateAttributesMapping,
            },
          )}
    </>
  );
}

export interface AvatarFallbackState extends AvatarRootState {}

export interface AvatarFallbackProps extends BaseUIComponentProps<'span', AvatarFallbackState> {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   *
   * @default 0
   */
  delay?: number | undefined;
}

export namespace AvatarFallback {
  export type State = AvatarFallbackState;
  export type Props = AvatarFallbackProps;
}
