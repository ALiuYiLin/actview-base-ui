import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/dialog';
import { createRenderer, describeConformance } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Dialog.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(<Dialog.Popup />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      render(Dialog.Root, {
        open: true,
        modal: false,
        children: <Dialog.Portal>{node}</Dialog.Portal>,
      }),
  }));

  it('throws a descriptive error when rendered outside <Dialog.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(Dialog.Popup)).rejects.toThrow(
        'Base UI: <Dialog.Root> is missing. Dialog parts must be placed within <Dialog.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  describe('prop: keepMounted', () => {
    [
      [true, true],
      [false, false],
      [undefined, false],
    ].forEach(([keepMounted, expectedIsMounted]) => {
      it(`should ${!expectedIsMounted ? 'not ' : ''}keep the dialog mounted when keepMounted=${keepMounted}`, async () => {
        await render(Dialog.Root, {
          open: false,
          modal: false,
          children: (
            <Dialog.Portal keepMounted={keepMounted as boolean | undefined}>
              <Dialog.Popup />
            </Dialog.Portal>
          ),
        });

        const dialog = screen.queryByRole('dialog', {hidden: true});
        if (expectedIsMounted) {
          expect(dialog).not.toBe(null);
        } else {
          expect(dialog).toBe(null);
        }
      });
    });
  });
});
