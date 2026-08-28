import { nextTick, reactive, shallowRef } from 'actview';
import { cleanup, render as actviewRender, waitFor } from '@actview/testing';
import { fireEvent } from './fireEvent';

export interface BaseUIRenderResult {
  container: HTMLElement;
  unmount: () => void;
  getByText: (text: string) => HTMLElement;
  queryByText: (text: string) => HTMLElement | null;
  getAllByText: (text: string) => HTMLElement[];
  queryAllByText: (text: string) => HTMLElement[];
  getByClass: (cls: string) => HTMLElement;
  queryByClass: (cls: string) => HTMLElement | null;
  getByTestId: (id: string) => HTMLElement;
  queryByTestId: (id: string) => HTMLElement | null;
  setProps: (newProps: Record<string, unknown>) => Promise<void>;
  rerender: (
    Component: any,
    props?: Record<string, unknown>,
  ) => Promise<void>;
}

export type BaseUITestRenderer = {
  render: (Component: any, props?: Record<string, unknown>) => Promise<BaseUIRenderResult>;
  cleanup: typeof cleanup;
  fireEvent: typeof fireEvent;
  waitFor: typeof waitFor;
  act: (fn: () => void | Promise<void>) => Promise<void>;
};

/**
 * Creates an ActView test renderer.
 *
 * Usage (ported tests):
 * ```ts
 * const { render } = createRenderer();
 * const result = await render(SwitchRoot, { checked: true });
 * await result.setProps({ checked: false });
 * await result.rerender(OtherComponent, { open: true });
 * ```
 *
 * `render` mounts the component through a harness that reads props from a reactive
 * object, so `setProps` re-renders in place — the ActView equivalent of React's
 * `rerender`/`setProps`. The current component is switched through a `shallowRef` read inside
 * the render function, so re-renders pick up the new component (`<component is>` built-in;
 * the PD-24 `is` residue is fixed framework-side).
 */
export function createRenderer(): BaseUITestRenderer {
  const render = async (Component: any, props: Record<string, unknown> = {}) => {
    const state = reactive({ ...props });
    const Current = shallowRef(Component);

    function Harness() {
      // Must end with a JSX return so the Babel transform wraps the harness (issue #19).
      // `<component is>` 动态切换当前组件（PD-24 的 is 残留已框架侧修复，
      // 无需再绕道 createElement）。
      return (
        <>
          <component is={Current.value} {...state} />
        </>
      );
    }

    const result = actviewRender(Harness);

    const setProps = async (newProps: Record<string, unknown>) => {
      // React cloneElement(element, newProps) 语义：浅合并，**不删除**未提供的键。
      // （React 版 setProps = rerender(cloneElement(element, newProps))，见
      // packages/react/test/createRenderer.ts:38-40 —— cloneElement 只合并。）
      // 之前的 delete 分支会在 setProps({ value: 60 }) 时删掉 renderFn 等
      // 未在 newProps 里的键 → 函数 children 丢失（MeterValue renderFn 失效）。
      Object.assign(state, newProps);
      await nextTick();
    };

    const rerender = async (nextComponent: any, nextProps?: Record<string, unknown>) => {
      Current.value = nextComponent;
      if (nextProps !== undefined) {
        await setProps(nextProps);
      } else {
        await nextTick();
      }
    };

    return { ...result, setProps, rerender };
  };

  return {
    render,
    cleanup,
    fireEvent,
    waitFor,
    act: async (fn: () => void | Promise<void>) => {
      await fn();
      await nextTick();
    },
  };
}
