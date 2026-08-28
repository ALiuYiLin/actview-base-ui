import {onMounted, onUnmounted, ref, toRefs, computed} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaViewportContext } from '../viewport/ScrollAreaViewportContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * The scroll area content.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaContent(componentProps: ScrollAreaContent.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const contentWrapperRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useScrollAreaRootContext();
  const viewportContext = useScrollAreaViewportContext();

  // 初始化型快照（仅 setup 一次性消费——对齐 React useRef 初始化器语义）。
  const computeOnInitialResizeRef = ref(rootContext.hasMeasuredScrollbar);

  // React 版 useIsoLayoutEffect：内容尺寸变化 → 重算 thumb
  let resizeObserver: ResizeObserver | null = null;
  let hasInitialized = false;

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const computeThumbPosition = viewportContext.computeThumbPosition;

    resizeObserver = new ResizeObserver(() => {
      if (!hasInitialized) {
        hasInitialized = true;

        // ResizeObserver fires once upon observing. Skip that initial call to avoid
        // double-calculating the thumb position on mount, unless the content mounted
        // after the viewport's initial measurement.
        if (!computeOnInitialResizeRef.value) {
          return;
        }
      }

      computeThumbPosition();
    });

    if (contentWrapperRef.value) {
      resizeObserver.observe(contentWrapperRef.value);
    }
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

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

  const state = computed<Record<string, any>>(() => rootContext.viewportState);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: scrollAreaStateAttributesMapping,
          ref: useMergedRefs(contentWrapperRef, componentProps.ref as any),
          props: elementProps.value,
        },
      )}
    </>
  );
}

export interface ScrollAreaContentState {}

export interface ScrollAreaContentProps
  extends BaseUIComponentProps<'div', ScrollAreaContentState> {}

export namespace ScrollAreaContent {
  export type State = ScrollAreaContentState;
  export type Props = ScrollAreaContentProps;
}
