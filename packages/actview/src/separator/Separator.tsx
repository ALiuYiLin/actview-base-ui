import { defineComponent, ref } from 'actview';
import type { BaseUIComponentProps, HTMLProps, Orientation } from '../internals/types';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export const Separator = defineComponent(function (componentProps: Separator.Props) {
  // 内部根元素 ref（PD-02：用户传 <Separator ref={x}/> 时 x 是组件实例；
  // 转发 DOM 的等价做法是组件内部模板 ref）
  const rootRef = ref<HTMLElement | null>(null);

  return () => {
    // ⚠️ 解构放渲染期——setup 层解构会冻结旧值（PD-15）
    const {
      render,
      orientation = 'horizontal',
      className,
      style,
      ...elementProps
    } = componentProps;

    const state: SeparatorState = { orientation };

    // 元素 props：ARIA 状态 + 用户透传（className/style 支持函数形态，按 state 解析）
    const merged: HTMLProps = {
      role: 'separator',
      'aria-orientation': orientation,
      className: typeof className === 'function' ? className(state) : className,
      style: typeof style === 'function' ? style(state) : style,
      ...elementProps,
    };

    // render 覆盖（默认 div）——两种形态
    if (render) {
      if (typeof render === 'function') {
        // render prop：单 props 对象（元素 props + state + ref 全合并），
        // 与组件 setup 收单个 props 对象的心智模型一致
        return render({ ...merged, ...state, ref: rootRef });
      }
      // render 是 VNode：复用其 type 渲染，合并 props。
      // key 在 render.key 字段（不在 props 里），须显式透传，否则列表 diff 会丢 key。
      // ref 放最后，强制用内部 ref（覆盖 VNode/merged 自带的 ref）。
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} />;
  };
});

export interface SeparatorProps extends BaseUIComponentProps<'div', SeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}
