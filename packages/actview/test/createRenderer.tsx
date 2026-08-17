import { nextTick, reactive, shallowRef } from 'actview';
import { createElement } from '@actview/jsx';
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
 * the render function, so re-renders pick up the new component (plantform-diff.md PD-24: the
 * `<component is>` built-in leaves `is` in the props, so `createElement` is used instead).
 */
export function createRenderer(): BaseUITestRenderer {
  const render = async (Component: any, props: Record<string, unknown> = {}) => {
    const state = reactive({ ...props });
    const Current = shallowRef(Component);

    function Harness() {
      // Must end with a JSX return so the Babel transform wraps the harness (issue #19).
      return <>{createElement(Current.value, state)}</>;
    }

    const result = actviewRender(Harness);

    const setProps = async (newProps: Record<string, unknown>) => {
      for (const key of Object.keys(state)) {
        if (!(key in newProps)) {
          delete state[key];
        }
      }
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
