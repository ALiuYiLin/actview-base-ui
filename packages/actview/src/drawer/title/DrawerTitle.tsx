import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A heading that labels the Drawer.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/Drawer)
 */
export function DrawerTitle(componentProps: DrawerTitle.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const store = useDialogRootContext(false)!;

  const id = useBaseUiId(componentProps.id);

  store.useSyncedValueWithCleanup('titleElementId', id as any);

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

  const rootProps = computed<Record<string, any>>(() => ({id, ...elementProps.value}));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'h2',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          ref: componentProps.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface DrawerTitleState {}

export interface DrawerTitleProps
  extends BaseUIComponentProps<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', DrawerTitleState> {
  children?: any;
  [key: string]: any;
}

export namespace DrawerTitle {
  export type State = DrawerTitleState;
  export type Props = DrawerTitleProps;
}
