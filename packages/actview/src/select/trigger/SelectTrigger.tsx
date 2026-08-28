import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/** The trigger of the select. Renders a `<button>` element. */
export function SelectTrigger(componentProps: SelectTrigger.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const store = useSelectRootContext(false);
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const openState = store.useState('open');
  const open = computed(() => openState.value);

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：触发语义 → 透传。
  const rootProps = computed<Record<string, any>>(() => {
    const disabled = store.state.disabled ?? false;
    return {
      type: 'button',
      ...elementProps.value,
      disabled,
      'aria-haspopup': 'listbox',
      'aria-expanded': open.value,
      onClick: () => {
        if (!disabled) {
          store.toggleOpen();
        }
      },
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'button',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          ref: useMergedRefs(
            (el: any) => {
              store.setTriggerProps({ref: el as HTMLElement | null});
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface SelectTriggerProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectTrigger {
  export type Props = SelectTriggerProps;
}
