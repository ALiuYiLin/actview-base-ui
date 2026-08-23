import { expect, vi } from 'vitest';
import { defineComponent } from 'actview';
import { Accordion } from '@/accordion';
import { describeConformance, createRenderer } from '#test-utils';
import { isJSDOM } from '@floating-ui/actview/utils';
import { screen, userEvent } from '#test-utils/rtl';

describe('<Accordion.Item />', () => {
  const { render } = createRenderer();

  it('throws when rendered outside an Accordion.Root', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(Accordion.Item)).rejects.toThrow(
        'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  describeConformance(<Accordion.Item />, () => ({
    render: (node) => {
      const Wrapper = defineComponent(function (props: {node: any}) {
        return () => <Accordion.Root>{props.node}</Accordion.Root>;
      });
      return render(Wrapper, {node});
    },
    refInstanceof: window.HTMLDivElement,
  }));

  describe('state', () => {
    it.skipIf(isJSDOM())(
      'does not report hidden=true after the item has started opening',
      async () => {
        const renderSpy = vi.fn();
        const Test = defineComponent(function () {
          return () => (
            <Accordion.Root>
              <Accordion.Item
                render={(props: any) => {
                  renderSpy(props);
                  // actview 单参 render 契约把 state 合并进 props（React 版双参时
                  // props 不含 state）——排除 DOM 不安全的 state 键（hidden 会使
                  // 子树被测试库视为 inaccessible）
                  const {hidden: _hidden, ...domProps} = props;
                  return <div {...domProps} />;
                }}
              >
                <Accordion.Header>
                  <Accordion.Trigger>Trigger</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>Panel</Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          );
        });

        const user = userEvent.setup();
        await render(Test);

        await user.click(screen.getByRole('button', {name: 'Trigger'}));

        expect(
          renderSpy.mock.calls.some((call: any[]) => {
            const state: any = call[0];
            return state.open === true && state.hidden === true;
          }),
        ).toBe(false);
      },
    );
  });
});
