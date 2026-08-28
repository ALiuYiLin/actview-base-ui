import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';

const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  border: '0',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
} as const;

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
      style={visuallyHiddenStyle}
      aria-hidden="true"
      data-base-ui-focus-guard=""
    />
  );
}
