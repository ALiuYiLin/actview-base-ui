import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Dialog } from '@/dialog';
import { createRenderer, describeConformance } from '#test-utils';
import { fireEvent, screen, waitFor } from '#test-utils/rtl';

describe('<Dialog.Viewport />', () => {
  const { render } = createRenderer();

  describeConformance(<Dialog.Viewport />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      render(Dialog.Root, {
        open: true,
        modal: false,
        children: (
          <Dialog.Portal>
            {node}
            <Dialog.Popup />
          </Dialog.Portal>
        ),
      }),
  }));

  it('renders only when the dialog is mounted by default', async () => {
    const App = defineComponent(function () {
      return () => (
        <Dialog.Root modal={false}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Viewport data-testid="viewport">
              <Dialog.Popup data-testid="popup">Content</Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      );
    });

    await render(App);

    expect(screen.queryByTestId('viewport')).toBe(null);

    // dialog 的 useClick 用 mousedown 事件打开
    fireEvent.mouseDown(screen.getByRole('button', {name: 'Open'}));

    await waitFor(() => {
      expect(screen.getByTestId('viewport')).not.toBe(null);
    });
    expect(screen.getByTestId('viewport')).toContain(screen.getByTestId('popup'));
  });

  it('stays mounted when used within a keepMounted portal', async () => {
    const {setProps} = await render(Dialog.Root, {
      open: true,
      modal: false,
      children: (
        <Dialog.Portal keepMounted>
          <Dialog.Viewport data-testid="viewport">
            <Dialog.Popup>Content</Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      ),
    });

    expect(screen.getByTestId('viewport')).not.toBe(null);

    await setProps({open: false});

    expect(screen.getByTestId('viewport')).not.toBe(null);
  });
});
