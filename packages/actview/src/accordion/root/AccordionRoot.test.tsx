import { expect, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { fireEvent, screen, waitFor } from '#test-utils/rtl';
import { userEvent } from '#test-utils/rtl';
import { Accordion } from '@/accordion';
import { createRenderer, describeConformance } from '#test-utils';
import { isJSDOM } from '@actview/floating-ui/utils';
import { REASONS } from '@/internals/reasons';

const PANEL_CONTENT_1 = 'Panel contents 1';
const PANEL_CONTENT_2 = 'Panel contents 2';

function App({children}: {children: any}) {
  return children;
}

describe('<Accordion.Root />', () => {
  const { render } = createRenderer();

  describeConformance(<Accordion.Root />, () => ({
    render: (node) => render(node.type, {...node.props}),
    refInstanceof: window.HTMLDivElement,
  }));

  it('warns when hiddenUntilFound overrides keepMounted={false}', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root hiddenUntilFound keepMounted={false}>
            <Accordion.Item>
              <Accordion.Panel>Panel</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      expect(warnSpy).toHaveBeenCalledWith(
        'Base UI: The `keepMounted={false}` prop on `Accordion.Root` is ignored when `hiddenUntilFound` is enabled, since panels must remain mounted while closed.',
      );
      expect(screen.getByText('Panel').getAttribute('hidden')).toBe('until-found');
    } finally {
      warnSpy.mockRestore();
    }
  });

  describe('ARIA attributes', () => {
    it('renders correct ARIA attributes', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root defaultValue={[0]}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');
      const panel = screen.queryByText(PANEL_CONTENT_1) as HTMLElement;

      expect(trigger).toHaveAttribute('aria-controls');
      expect(panel.getAttribute('id')).toBe(trigger.getAttribute('aria-controls'));
      expect(panel).toHaveAttribute('role', 'region');
      expect(trigger.getAttribute('id')).toBe(panel.getAttribute('aria-labelledby'));
    });

    it('references manual panel id in trigger aria-controls', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root defaultValue={[0]}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel id="custom-panel-id">{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');
      const panel = screen.queryByText(PANEL_CONTENT_1) as HTMLElement;

      expect(trigger).toHaveAttribute('aria-controls', 'custom-panel-id');
      expect(panel).toHaveAttribute('id', 'custom-panel-id');
    });

    it('references manual trigger id in panel aria-labelledby', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root defaultValue={[0]}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger id="custom-trigger-id">Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const panel = screen.getByText(PANEL_CONTENT_1);

      expect(panel).toHaveAttribute('aria-labelledby', 'custom-trigger-id');
    });

    it('updates panel labeling when a manual trigger id is added or changed', async () => {
      const Test = defineComponent(function () {
        const triggerId = ref<string | undefined>(undefined);
        return () => (
          <>
            <button type="button" onClick={() => (triggerId.value = 'custom-trigger-id-1')}>
              Set id 1
            </button>
            <button type="button" onClick={() => (triggerId.value = 'custom-trigger-id-2')}>
              Set id 2
            </button>
            <Accordion.Root defaultValue={[0]}>
              <Accordion.Item value={0}>
                <Accordion.Header>
                  <Accordion.Trigger id={triggerId.value}>Trigger 1</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          </>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button', {name: 'Trigger 1'});
      const panel = screen.getByText(PANEL_CONTENT_1);

      expect(trigger).toHaveAttribute('id');
      expect(panel).toHaveAttribute('aria-labelledby', trigger.id);

      await user.click(screen.getByRole('button', {name: 'Set id 1'}));

      await waitFor(() => {
        expect(trigger).toHaveAttribute('id', 'custom-trigger-id-1');
      });
      await waitFor(() => {
        expect(panel).toHaveAttribute('aria-labelledby', 'custom-trigger-id-1');
      });

      await user.click(screen.getByRole('button', {name: 'Set id 2'}));

      await waitFor(() => {
        expect(trigger).toHaveAttribute('id', 'custom-trigger-id-2');
      });
      await waitFor(() => {
        expect(panel).toHaveAttribute('aria-labelledby', 'custom-trigger-id-2');
      });
    });

    it('restores panel labeling when a manual trigger id is removed', async () => {
      const Test = defineComponent(function () {
        const triggerId = ref<string | undefined>('custom-trigger-id');
        return () => (
          <>
            <button type="button" onClick={() => (triggerId.value = undefined)}>
              Remove id
            </button>
            <Accordion.Root defaultValue={[0]}>
              <Accordion.Item value={0}>
                <Accordion.Header>
                  <Accordion.Trigger id={triggerId.value}>Trigger 1</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          </>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button', {name: 'Trigger 1'});
      const panel = screen.getByText(PANEL_CONTENT_1);

      expect(panel).toHaveAttribute('aria-labelledby', 'custom-trigger-id');

      await user.click(screen.getByRole('button', {name: 'Remove id'}));

      await waitFor(() => {
        expect(trigger).toHaveAttribute('id');
        expect(trigger).not.toHaveAttribute('id', 'custom-trigger-id');
      });
      await waitFor(() => {
        expect(panel).toHaveAttribute('aria-labelledby', trigger.id);
      });
    });

    it('unregisters generated part ids when the trigger or panel unmounts', async () => {
      const Test = defineComponent(function (props: {parts: 'both' | 'trigger' | 'panel'}) {
        return () => (
          <Accordion.Root defaultValue={[0]}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                {props.parts !== 'panel' && <Accordion.Trigger>Trigger 1</Accordion.Trigger>}
              </Accordion.Header>
              {props.parts !== 'trigger' && <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>}
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const result = await render(Test, {parts: 'both' as const});

      await result.setProps({parts: 'panel' as const});
      expect(screen.getByText(PANEL_CONTENT_1)).not.toHaveAttribute('aria-labelledby');

      await result.setProps({parts: 'both' as const});
      let trigger = screen.getByRole('button', {name: 'Trigger 1'});
      let panel = screen.getByText(PANEL_CONTENT_1);
      expect(panel).toHaveAttribute('aria-labelledby', trigger.id);

      await result.setProps({parts: 'trigger' as const});
      expect(screen.getByRole('button', {name: 'Trigger 1'})).not.toHaveAttribute(
        'aria-controls',
      );

      await result.setProps({parts: 'both' as const});
      trigger = screen.getByRole('button', {name: 'Trigger 1'});
      panel = screen.getByText(PANEL_CONTENT_1);
      expect(trigger).toHaveAttribute('aria-controls', panel.id);
    });

    // 待补：actview 无 renderToString/hydrate（SSR 基建未迁移）
    it.skip('preserves generated part associations during hydration (pending SSR infra)', async () => {});
  });

  describe('uncontrolled', () => {
    it.skipIf(isJSDOM())('open state', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root>
            <Accordion.Item>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button');

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);

      await user.pointer({keys: '[MouseLeft]', target: trigger});

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('data-panel-open');
      expect(screen.queryByText(PANEL_CONTENT_1)).not.toBe(null);
      expect(screen.queryByText(PANEL_CONTENT_1)).toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');

      await user.pointer({keys: '[MouseLeft]', target: trigger});

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
    });

    describe('prop: defaultValue', () => {
      it('custom item value', async () => {
        const Test = defineComponent(function () {
          return () => (
            <Accordion.Root defaultValue={['first']}>
              <Accordion.Item value="first">
                <Accordion.Header>
                  <Accordion.Trigger>Trigger 1</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="second">
                <Accordion.Header>
                  <Accordion.Trigger>Trigger 2</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_2}</Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          );
        });

        await render(Test);

        expect(screen.queryByText(PANEL_CONTENT_1)).not.toBe(null);
        expect(screen.queryByText(PANEL_CONTENT_1)).toBeVisible();
        expect(screen.queryByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');

        expect(screen.queryByText(PANEL_CONTENT_2)).toBe(null);
      });
    });
  });

  describe('controlled', () => {
    it.skipIf(isJSDOM())('open state', async () => {
      const Test = defineComponent(function () {
        const value = ref([] as any[]);
        return () => (
          <Accordion.Root
            value={value.value}
            onValueChange={(nextValue) => (value.value = nextValue)}
          >
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const result = await render(Test);
      const trigger = screen.getByRole('button');

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);

      await result.setProps({});
      await waitFor(() => {});

      // controlled open state 通过外部 setProps 更新 value prop 演示
      const Controlled = defineComponent(function (props: {value: any[]}) {
        return () => (
          <Accordion.Root
            value={props.value}
            onValueChange={(nextValue) => (props.value = nextValue)}
          >
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });
      const controlledResult = await render(Controlled, {value: [] as any[]});

      expect(controlledResult.container.querySelector('button')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      await controlledResult.setProps({value: [0]});
      await waitFor(() => {
        expect(controlledResult.container.querySelector('button')).toHaveAttribute(
          'aria-expanded',
          'true',
        );
      });
      expect(screen.queryByText(PANEL_CONTENT_1)).not.toBe(null);
      expect(screen.queryByText(PANEL_CONTENT_1)).toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');

      await controlledResult.setProps({value: [] as any[]});
      await waitFor(() => {
        expect(controlledResult.container.querySelector('button')).toHaveAttribute(
          'aria-expanded',
          'false',
        );
      });
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
    });

    describe('prop: value', () => {
      it('custom item value', async () => {
        const Test = defineComponent(function () {
          return () => (
            <Accordion.Root value={['one']}>
              <Accordion.Item value="one">
                <Accordion.Header>
                  <Accordion.Trigger>Trigger 1</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="second">
                <Accordion.Header>
                  <Accordion.Trigger>Trigger 2</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_2}</Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          );
        });

        await render(Test);

        expect(screen.queryByText(PANEL_CONTENT_1)).not.toBe(null);
        expect(screen.queryByText(PANEL_CONTENT_1)).toBeVisible();
        expect(screen.queryByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');

        expect(screen.queryByText(PANEL_CONTENT_2)).toBe(null);
      });
    });
  });

  describe('prop: disabled', () => {
    it('can disable the whole accordion', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root defaultValue={[0]} disabled>
            <Accordion.Item data-testid="item1" value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item data-testid="item2" value={1}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 2</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_2}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const item1 = screen.getByTestId('item1');
      const panel1 = screen.queryByText(PANEL_CONTENT_1);
      const [header1, header2] = screen.getAllByRole('heading');
      const [trigger1, trigger2] = screen.getAllByRole('button');
      const item2 = screen.getByTestId('item2');

      [item1, header1, trigger1, panel1, item2, header2, trigger2].forEach((element) => {
        expect(element).toHaveAttribute('data-disabled');
      });
    });

    it('can disable one accordion item', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root defaultValue={[0]}>
            <Accordion.Item data-testid="item1" value={0} disabled>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item data-testid="item2" value={1}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 2</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_2}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const item1 = screen.getByTestId('item1');
      const panel1 = screen.queryByText(PANEL_CONTENT_1);
      const [header1, header2] = screen.getAllByRole('heading');
      const [trigger1, trigger2] = screen.getAllByRole('button');
      const item2 = screen.getByTestId('item2');

      [item1, header1, trigger1, panel1].forEach((element) => {
        expect(element).toHaveAttribute('data-disabled');
      });
      [item2, header2, trigger2].forEach((element) => {
        expect(element).not.toHaveAttribute('data-disabled');
      });
    });

    it.each(['root', 'item'] as const)(
      'does not toggle or fire callbacks when the %s is disabled',
      async (disabledPart) => {
        const onValueChange = vi.fn();
        const onOpenChange = vi.fn();

        const Test = defineComponent(function (props: {disabledPart: 'root' | 'item'}) {
          return () => (
            <Accordion.Root
              disabled={props.disabledPart === 'root'}
              onValueChange={onValueChange}
            >
              <Accordion.Item
                value={0}
                disabled={props.disabledPart === 'item'}
                onOpenChange={onOpenChange}
              >
                <Accordion.Header>
                  <Accordion.Trigger disabled={false}>Trigger 1</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value={1} onOpenChange={onOpenChange}>
                <Accordion.Header>
                  <Accordion.Trigger disabled={false}>Trigger 2</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_2}</Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          );
        });

        const user = userEvent.setup();
        await render(Test, {disabledPart});

        const [trigger1] = screen.getAllByRole('button');

        await user.pointer({keys: '[MouseLeft]', target: trigger1});
        trigger1.focus();
        await user.keyboard('[Space]');
        await user.keyboard('[Enter]');

        expect(trigger1).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
        expect(onValueChange.mock.calls.length).toBe(0);
        expect(onOpenChange.mock.calls.length).toBe(0);
      },
    );
  });

  it('allows onMouseUp to call preventBaseUIHandler on the trigger', async () => {
    const Test = defineComponent(function () {
      return () => (
        <Accordion.Root>
          <Accordion.Item value={0}>
            <Accordion.Header>
              <Accordion.Trigger onMouseUp={(event: any) => event.preventBaseUIHandler()}>
                Trigger 1
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      );
    });

    await render(Test);

    const trigger = screen.getByRole('button', {name: 'Trigger 1'});

    expect(() => fireEvent.mouseUp(trigger)).not.toThrow();
  });

  describe.skipIf(isJSDOM())('keyboard interactions', () => {
    [true, false].forEach((isNativeButton) => {
      describe(`rendering ${isNativeButton ? 'interactive' : 'non-interactive'} triggers`, () => {
        ['Enter', 'Space'].forEach((key) => {
          it(`key: ${key} toggles the Accordion open state`, async () => {
            const Test = defineComponent(function () {
              return () => (
                <Accordion.Root>
                  <Accordion.Item>
                    <Accordion.Header>
                      <Accordion.Trigger
                        nativeButton={isNativeButton}
                        render={isNativeButton ? undefined : <span />}
                      >
                        Trigger 1
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
                  </Accordion.Item>
                </Accordion.Root>
              );
            });

            const user = userEvent.setup();
            await render(Test);

            const trigger = screen.getByRole('button');

            expect(trigger).toHaveAttribute('aria-expanded', 'false');

            expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);

            await user.keyboard('[Tab]');
            expect(trigger).toHaveFocus();
            await user.keyboard(`[${key}]`);

            expect(trigger).toHaveAttribute('aria-expanded', 'true');
            expect(trigger).toHaveAttribute('data-panel-open');
            expect(screen.queryByText(PANEL_CONTENT_1)).not.toBe(null);
            expect(screen.queryByText(PANEL_CONTENT_1)).toBeVisible();
            expect(screen.queryByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');

            await user.keyboard(`[${key}]`);

            expect(trigger).toHaveAttribute('aria-expanded', 'false');
            expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
          });
        });
      });
    });
  });

  describe('keyboard activation timing', () => {
    [true, false].forEach((isNativeButton) => {
      it(`opens and closes on Space keyup when rendering ${
        isNativeButton ? 'interactive' : 'non-interactive'
      } triggers`, async () => {
        const onOpenChange = vi.fn();

        const Test = defineComponent(function () {
          return () => (
            <Accordion.Root>
              <Accordion.Item onOpenChange={onOpenChange}>
                <Accordion.Header>
                  <Accordion.Trigger
                    nativeButton={isNativeButton}
                    render={isNativeButton ? undefined : <span />}
                  >
                    Trigger 1
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          );
        });

        const user = userEvent.setup();
        await render(Test);

        const trigger = screen.getByRole('button');

        await user.keyboard('[Tab]');
        expect(trigger).toHaveFocus();

        await user.keyboard('[Space>]');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText(PANEL_CONTENT_1)).not.toBeInTheDocument();
        expect(onOpenChange).not.toHaveBeenCalled();

        await user.keyboard('[/Space]');
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText(PANEL_CONTENT_1)).toBeInTheDocument();
        expect(onOpenChange).toHaveBeenCalledTimes(1);
        expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.anything());

        await user.keyboard('[Space>]');
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText(PANEL_CONTENT_1)).toBeInTheDocument();
        expect(onOpenChange).toHaveBeenCalledTimes(1);

        await user.keyboard('[/Space]');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText(PANEL_CONTENT_1)).not.toBeInTheDocument();
        expect(onOpenChange).toHaveBeenCalledTimes(2);
        expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.anything());
      });
    });
  });

  describe('BaseUIChangeEventDetails', () => {
    it('onOpenChange cancel() prevents opening while uncontrolled', async () => {
      const onValueChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root onValueChange={onValueChange}>
            <Accordion.Item
              value={0}
              onOpenChange={(nextOpen, eventDetails: any) => {
                if (nextOpen) {
                  eventDetails.cancel();
                }
              }}
            >
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(onValueChange.mock.calls.length).toBe(0);
    });

    it('onValueChange cancel() prevents opening while uncontrolled', async () => {
      const onValueChange = vi.fn((_value: any, eventDetails: any) => {
        eventDetails.cancel();
      });

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root onValueChange={onValueChange}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(onValueChange.mock.calls.length).toBe(1);
    });

    it('onValueChange cancel() prevents closing while uncontrolled', async () => {
      const onValueChange = vi.fn((_value: any, eventDetails: any) => {
        eventDetails.cancel();
      });

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root defaultValue={[0]} onValueChange={onValueChange}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');
      expect(onValueChange).toHaveBeenCalledOnce();
      expect(onValueChange.mock.lastCall?.[0]).toEqual([]);
    });

    it('onOpenChange cancel() prevents onValueChange while controlled', async () => {
      const onValueChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root value={[]} onValueChange={onValueChange}>
            <Accordion.Item
              value={0}
              onOpenChange={(nextOpen, eventDetails: any) => {
                if (nextOpen) {
                  eventDetails.cancel();
                }
              }}
            >
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(onValueChange.mock.calls.length).toBe(0);
    });

    it('onValueChange cancel() prevents opening while controlled', async () => {
      const onValueChange = vi.fn();

      const Test = defineComponent(function () {
        const value = ref([] as number[]);
        return () => (
          <Accordion.Root
            value={value.value}
            onValueChange={(nextValue: any, eventDetails: any) => {
              onValueChange(nextValue, eventDetails);
              eventDetails.cancel();
              if (!eventDetails.isCanceled) {
                value.value = nextValue;
              }
            }}
          >
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(onValueChange.mock.calls.length).toBe(1);
    });

    it('onValueChange cancel() prevents opening while multiple', async () => {
      const onValueChange = vi.fn((_value: any, eventDetails: any) => {
        eventDetails.cancel();
      });

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root multiple onValueChange={onValueChange}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(onValueChange.mock.calls.length).toBe(1);
    });

    it('onValueChange cancel() prevents closing while multiple', async () => {
      const onValueChange = vi.fn((_value: any, eventDetails: any) => {
        eventDetails.cancel();
      });

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root defaultValue={[0]} multiple onValueChange={onValueChange}>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByText(PANEL_CONTENT_1)).not.toBe(null);
      expect(onValueChange.mock.calls.length).toBe(1);
    });
  });

  describe.skipIf(isJSDOM())('prop: multiple', () => {
    it('multiple items can be open when `multiple = true`', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root multiple>
            <Accordion.Item>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 2</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_2}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const [trigger1, trigger2] = screen.getAllByRole('button');

      expect(trigger1).not.toHaveAttribute('data-panel-open');
      expect(trigger2).not.toHaveAttribute('data-panel-open');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(screen.queryByText(PANEL_CONTENT_2)).toBe(null);

      await user.pointer({keys: '[MouseLeft]', target: trigger1});
      await user.pointer({keys: '[MouseLeft]', target: trigger2});

      expect(screen.queryByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');
      expect(screen.queryByText(PANEL_CONTENT_2)).toHaveAttribute('data-open');
      expect(trigger1).toHaveAttribute('data-panel-open');
      expect(trigger2).toHaveAttribute('data-panel-open');

      await user.pointer({keys: '[MouseLeft]', target: trigger1});

      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(screen.getByText(PANEL_CONTENT_2)).toHaveAttribute('data-open');
      expect(trigger1).not.toHaveAttribute('data-panel-open');
      expect(trigger2).toHaveAttribute('data-panel-open');
    });

    it('when false only one item can be open', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root multiple={false}>
            <Accordion.Item>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 2</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>{PANEL_CONTENT_2}</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const [trigger1, trigger2] = screen.getAllByRole('button');

      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(screen.queryByText(PANEL_CONTENT_2)).toBe(null);
      expect(trigger1).not.toHaveAttribute('data-panel-open');
      expect(trigger2).not.toHaveAttribute('data-panel-open');

      await user.pointer({keys: '[MouseLeft]', target: trigger1});

      expect(screen.queryByText(PANEL_CONTENT_1)).toHaveAttribute('data-open');
      expect(trigger1).toHaveAttribute('data-panel-open');

      await user.pointer({keys: '[MouseLeft]', target: trigger2});

      expect(screen.queryByText(PANEL_CONTENT_2)).toHaveAttribute('data-open');
      expect(trigger2).toHaveAttribute('data-panel-open');
      expect(screen.queryByText(PANEL_CONTENT_1)).toBe(null);
      expect(trigger1).not.toHaveAttribute('data-panel-open');
    });
  });

  describe.skipIf(isJSDOM())('prop: onValueChange', () => {
    it('default item value', async () => {
      const onValueChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root onValueChange={onValueChange} multiple>
            <Accordion.Item value={0}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>1</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value={1}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 2</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>2</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const [trigger1, trigger2] = screen.getAllByRole('button');

      expect(onValueChange.mock.calls.length).toBe(0);

      await user.pointer({keys: '[MouseLeft]', target: trigger1});

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.lastCall?.[0]).toEqual([0]);
      expect(onValueChange.mock.lastCall?.[1].reason).toBe(REASONS.triggerPress);
      expect(onValueChange.mock.lastCall?.[1].event.type).not.toBe('base-ui');

      trigger2.focus();
      await user.keyboard('[Space]');

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.lastCall?.[0]).toEqual([0, 1]);
      expect(onValueChange.mock.lastCall?.[1].reason).toBe(REASONS.triggerPress);
      expect(onValueChange.mock.lastCall?.[1].event.type).not.toBe('base-ui');
    });

    it('custom item value', async () => {
      const onValueChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root onValueChange={onValueChange} multiple>
            <Accordion.Item value="one">
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>1</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="two">
              <Accordion.Header>
                <Accordion.Trigger>Trigger 2</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>2</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const [trigger1, trigger2] = screen.getAllByRole('button');

      expect(onValueChange.mock.calls.length).toBe(0);

      await user.pointer({keys: '[MouseLeft]', target: trigger2});

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toEqual(['two']);

      await user.pointer({keys: '[MouseLeft]', target: trigger1});

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[1][0]).toEqual(['two', 'one']);
    });

    it('`multiple` is false', async () => {
      const onValueChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Accordion.Root onValueChange={onValueChange} multiple={false}>
            <Accordion.Item value="one">
              <Accordion.Header>
                <Accordion.Trigger>Trigger 1</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>1</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="two">
              <Accordion.Header>
                <Accordion.Trigger>Trigger 2</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>2</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const [trigger1, trigger2] = screen.getAllByRole('button');

      expect(onValueChange.mock.calls.length).toBe(0);

      await user.pointer({keys: '[MouseLeft]', target: trigger1});

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toEqual(['one']);

      await user.pointer({keys: '[MouseLeft]', target: trigger2});

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[1][0]).toEqual(['two']);
    });
  });
});
