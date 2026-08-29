import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { visuallyHidden } from '@/utils/visuallyHidden';

/**
 * @internal
 */
export function FocusGuard(props: any) {
  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { ...elementRefs } = toRefs(props) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed ----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  return (
    <span
      {...elementProps.value}
      tabIndex={0}
      // 与 React 参考一致：公共 visuallyHidden（position: fixed + 布局值），
      // 非自定义的 absolute/1px 变体（M2-原语-2）。
      style={visuallyHidden}
      aria-hidden="true"
      data-base-ui-focus-guard=""
    />
  );
}
