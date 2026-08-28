import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * @internal
 */
export function InternalBackdrop(props: InternalBackdrop.Props) {
  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素；
  // cutout/inert 为组件自定义 props，单独持有。
  const { cutout, inert, ...elementRefs } = toRefs(props as any) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed ----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) {
      if (k === 'ref' || k === 'style') continue;
      out[k] = elementRefs[k].value;
    }
    return out;
  });

  const style = computed<any>(() => {
    let clipPath: string | undefined;
    if (cutout?.value) {
      const rect = cutout.value.getBoundingClientRect();
      clipPath = `polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${rect.left}px ${rect.top}px,${rect.left}px ${rect.bottom}px,${rect.right}px ${rect.bottom}px,${rect.right}px ${rect.top}px,${rect.left}px ${rect.top}px)`;
    }

    const merged: any = {
      position: 'fixed',
      inset: 0,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      clipPath,
      ...(elementRefs.style?.value ?? {}),
    };

    if (inert?.value) {
      merged.pointerEvents = 'none';
    }

    return merged;
  });

  return (
    <div
      ref={useMergedRefs(props.ref as any)}
      role="presentation"
      // Ensures Floating UI's outside press detection runs, as it considers
      // it an element that existed when the popup rendered.
      data-base-ui-inert=""
      {...elementProps.value}
      style={style.value}
    />
  );
}

export interface InternalBackdropState {}

export interface InternalBackdropProps {
  /**
   * The element to cut out of the backdrop.
   */
  cutout?: Element | null | undefined;
  inert?: boolean | undefined;
  style?: any;
  ref?: any;
  [key: string]: any;
}

export namespace InternalBackdrop {
  export type State = InternalBackdropState;
  export type Props = InternalBackdropProps;
}
