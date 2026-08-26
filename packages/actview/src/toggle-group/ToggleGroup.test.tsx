import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { ToggleGroup } from '@/toggle-group';
import { Toggle } from '@/toggle';
import { Toolbar } from '@/toolbar';
import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { fireEvent, screen, userEvent } from '#test-utils/rtl';
import { DirectionProvider } from '@/direction-provider';
import type { TextDirection } from '@/direction-provider';
import type { Orientation } from '@/internals/types';

describe('<ToggleGroup />', () => {
  const { render } = createRenderer();

  describeConformance(<ToggleGroup.Root />, () => ({
    render: (node) => render(node.type, {...(node.props ?? {})}),
    refInstanceof: window.HTMLDivElement,
  }));

  it('renders a `group`', async () => {
    await render(ToggleGroup.Root, {'aria-label': 'My Toggle Group', children: null});

    expect(screen.queryByRole('group', {name: 'My Toggle Group'})).not.toBe(null);
  });

  describe('uncontrolled', () => {
    it('pressed state', async ({skip}) => {
      if (isJSDOM) {
        skip();
      }

      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button1});

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button1).toHaveAttribute('data-pressed');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button2});

      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');
      expect(button1).toHaveAttribute('aria-pressed', 'false');
    });

    it('prop: defaultValue', async () => {
      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        defaultValue: ['two'],
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');
      expect(button1).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button1});

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button1).toHaveAttribute('data-pressed');
      expect(button2).toHaveAttribute('aria-pressed', 'false');
    });

    it('when Toggles omit value', async () => {
      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        children: (
          <>
            <Toggle.Root children={null} />
            <Toggle.Root value="" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button2).toHaveAttribute('aria-pressed', 'false');
      expect(button1).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button1});
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button2});
      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });

    it('should warn if Toggle value is not set and ToggleGroup value is defined', async () => {
      vi.spyOn(console, 'error')
        .mockName('console.error')
        .mockImplementation(() => {});

      await render(ToggleGroup.Root, {
        defaultValue: ['one'],
        children: (
          <>
            <Toggle.Root children={null} />
            <Toggle.Root children={null} />
          </>
        ),
      });

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop',
        ),
      );
    });
  });

  describe('controlled', () => {
    it('pressed state', async () => {
      const {setProps} = await render(ToggleGroup.Root, {
        value: ['two'],
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');

      await setProps({value: ['one']});

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button1).toHaveAttribute('data-pressed');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await setProps({value: ['two']});

      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');
      expect(button1).toHaveAttribute('aria-pressed', 'false');
    });

    it('prop: value', async () => {
      const {setProps} = await render(ToggleGroup.Root, {
        value: ['two'],
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button2).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('data-pressed');
      expect(button1).toHaveAttribute('aria-pressed', 'false');

      await setProps({value: ['one']});

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button1).toHaveAttribute('data-pressed');
      expect(button2).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('prop: disabled', () => {
    it('can disable the whole group', async () => {
      await render(ToggleGroup.Root, {
        disabled: true,
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button1).toHaveAttribute('aria-disabled', 'true');
      expect(button1).toHaveAttribute('data-disabled');
      expect(button2).toHaveAttribute('aria-disabled', 'true');
      expect(button2).toHaveAttribute('data-disabled');
    });

    it('can disable individual items', async () => {
      await render(ToggleGroup.Root, {
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" disabled children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button1).toHaveAttribute('aria-disabled', 'false');
      expect(button1).not.toHaveAttribute('data-disabled');
      expect(button2).toHaveAttribute('aria-disabled', 'true');
      expect(button2).toHaveAttribute('data-disabled');
    });
  });

  describe('prop: orientation', () => {
    it('vertical', async () => {
      await render(ToggleGroup.Root, {
        orientation: 'vertical',
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const group = screen.queryByRole('group');
      expect(group).toHaveAttribute('data-orientation', 'vertical');
    });

    it('does not render aria-orientation on role="group"', async () => {
      await render(ToggleGroup.Root, {
        orientation: 'horizontal',
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const group = screen.queryByRole('group');
      expect(group).not.toHaveAttribute('aria-orientation');
    });
  });

  describe('prop: multiple', () => {
    it('sets data-multiple only when true', async () => {
      // multiple 初始传入（false）——actview toRefs 只捕获初始存在的 props 键，
      // setProps 新增键不会触发更新；显式传 false 与 React 默认值行为等价。
      const {setProps} = await render(ToggleGroup.Root, {
        multiple: false,
        children: <Toggle.Root value="one" children={null} />,
      });

      const group = screen.getByRole('group');
      expect(group).not.toHaveAttribute('data-multiple');

      await setProps({multiple: true});
      expect(group).toHaveAttribute('data-multiple');

      await setProps({multiple: false});
      expect(group).not.toHaveAttribute('data-multiple');
    });

    it('multiple items can be pressed when true', async () => {
      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        multiple: true,
        defaultValue: ['one'],
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button2});

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });

    it('only one item can be pressed when false', async () => {
      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        defaultValue: ['one'],
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button2});

      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });

    it('when Toggles omit value', async () => {
      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        multiple: true,
        children: (
          <>
            <Toggle.Root value="" children={null} />
            <Toggle.Root children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(button2).toHaveAttribute('aria-pressed', 'false');
      expect(button1).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button1});
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await user.pointer({keys: '[MouseLeft]', target: button2});
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'true');

      await user.pointer({keys: '[MouseLeft]', target: button1});
      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe.skipIf(isJSDOM)('keyboard interactions', () => {
    [
      ['ltr', 'horizontal', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'],
      ['ltr', 'vertical', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'],
      ['rtl', 'horizontal', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'],
      ['rtl', 'vertical', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
    ].forEach((entry) => {
      const [direction, orientation, nextKey, prevKey, ignoredNextKey, ignoredPrevKey] = entry;

      describe(direction, () => {
        it(`orientation: ${orientation}`, async () => {
          const user = userEvent.setup();
      await render(
            DirectionProvider,
            {
              direction: direction as TextDirection,
              children: (
                <ToggleGroup.Root orientation={orientation as Orientation}>
                  <Toggle.Root value="one" children={null} />
                  <Toggle.Root value="two" children={null} />
                  <Toggle.Root value="three" children={null} />
                </ToggleGroup.Root>
              ),
            },
          );

          const [button1, button2, button3] = screen.getAllByRole('button');

          await user.keyboard('[Tab]');

          expect(button1).toHaveAttribute('tabindex', '0');
          expect(button1).toHaveFocus();

          await user.keyboard(`[${nextKey}]`);

          expect(button2).toHaveAttribute('tabindex', '0');
          expect(button2).toHaveFocus();

          await user.keyboard(`[${nextKey}]`);

          expect(button3).toHaveAttribute('tabindex', '0');
          expect(button3).toHaveFocus();

          // loop to the beginning
          await user.keyboard(`[${nextKey}]`);

          expect(button1).toHaveAttribute('tabindex', '0');
          expect(button1).toHaveFocus();

          await user.keyboard(`[${prevKey}]`);

          expect(button3).toHaveAttribute('tabindex', '0');
          expect(button3).toHaveFocus();

          await user.keyboard(`[${prevKey}]`);

          expect(button2).toHaveAttribute('tabindex', '0');
          expect(button2).toHaveFocus();

          // keys from the other axis should not move focus
          await user.keyboard(`[${ignoredNextKey}]`);

          expect(button2).toHaveAttribute('tabindex', '0');
          expect(button2).toHaveFocus();

          await user.keyboard(`[${ignoredPrevKey}]`);

          expect(button2).toHaveAttribute('tabindex', '0');
          expect(button2).toHaveFocus();
        });
      });
    });

    it('Home key moves focus to the first item', async () => {
      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
            <Toggle.Root value="three" children={null} />
          </>
        ),
      });

      const [button1, button2, button3] = screen.getAllByRole('button');

      await user.keyboard('[Tab]');
      expect(button1).toHaveFocus();

      await user.keyboard('[ArrowRight][ArrowRight]');
      expect(button3).toHaveFocus();

      await user.keyboard('[Home]');
      expect(button1).toHaveAttribute('tabindex', '0');
      expect(button1).toHaveFocus();

      await user.keyboard('[ArrowRight]');
      expect(button2).toHaveFocus();

      await user.keyboard('[Home]');
      expect(button1).toHaveAttribute('tabindex', '0');
      expect(button1).toHaveFocus();
    });

    it('End key moves focus to the last item', async () => {
      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
            <Toggle.Root value="three" children={null} />
          </>
        ),
      });

      const [button1, button2, button3] = screen.getAllByRole('button');

      await user.keyboard('[Tab]');
      expect(button1).toHaveFocus();

      await user.keyboard('[End]');
      expect(button3).toHaveAttribute('tabindex', '0');
      expect(button3).toHaveFocus();

      await user.keyboard('[ArrowLeft]');
      expect(button2).toHaveFocus();

      await user.keyboard('[End]');
      expect(button3).toHaveAttribute('tabindex', '0');
      expect(button3).toHaveFocus();
    });

    ['Enter', 'Space'].forEach((key) => {
      it(`key: ${key} toggles the pressed state`, async () => {
        const user = userEvent.setup();
      await render(ToggleGroup.Root, {
          children: (
            <>
              <Toggle.Root value="one" children={null} />
              <Toggle.Root value="two" children={null} />
            </>
          ),
        });

        const [button1] = screen.getAllByRole('button');

        expect(button1).toHaveAttribute('aria-pressed', 'false');

        button1.focus();
        await nextTick();

        await user.keyboard(`[${key}]`);

        expect(button1).toHaveAttribute('aria-pressed', 'true');

        await user.keyboard(`[${key}]`);

        expect(button1).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });

  describe('prop: onValueChange', () => {
    it('fires when an Item is clicked', async () => {
      const onValueChange = vi.fn();

      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        onValueChange,
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1, button2] = screen.getAllByRole('button');

      expect(onValueChange.mock.calls.length).toBe(0);

      await user.pointer({keys: '[MouseLeft]', target: button1});

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toEqual(['one']);

      await user.pointer({keys: '[MouseLeft]', target: button2});

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[1][0]).toEqual(['two']);
    });

    it('does not change the value when the event is canceled', async () => {
      const onValueChange = vi.fn((_value, eventDetails) => {
        eventDetails.cancel();
      });

      const user = userEvent.setup();
      await render(ToggleGroup.Root, {
        onValueChange,
        children: (
          <>
            <Toggle.Root value="one" children={null} />
            <Toggle.Root value="two" children={null} />
          </>
        ),
      });

      const [button1] = screen.getAllByRole('button');

      await user.pointer({keys: '[MouseLeft]', target: button1});

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(button1).toHaveAttribute('aria-pressed', 'false');
    });

    ['Enter', 'Space'].forEach((key) => {
      it(`fires when the ${key} is pressed`, async ({skip}) => {
        if (isJSDOM) {
          skip();
        }

        const onValueChange = vi.fn();

        const user = userEvent.setup();
      await render(ToggleGroup.Root, {
          onValueChange,
          children: (
            <>
              <Toggle.Root value="one" children={null} />
              <Toggle.Root value="two" children={null} />
            </>
          ),
        });

        const [button1, button2] = screen.getAllByRole('button');

        expect(onValueChange.mock.calls.length).toBe(0);

        button1.focus();
        await nextTick();

        await user.keyboard(`[${key}]`);

        expect(onValueChange.mock.calls.length).toBe(1);
        expect(onValueChange.mock.calls[0][0]).toEqual(['one']);

        button2.focus();
        await nextTick();

        await user.keyboard(`[${key}]`);

        expect(onValueChange.mock.calls.length).toBe(2);
        expect(onValueChange.mock.calls[1][0]).toEqual(['two']);
      });
    });
  });

  // React 版该场景（multiple transitions 嵌套 Toolbar.Group）在 chromium 跑
  // （skipIf(isJSDOM)）——roving focus 依赖真实布局，jsdom 下跳过。
  describe.skipIf(isJSDOM)('nested in Toolbar.Group', () => {
    it('preserves selection and roving focus', async () => {
      const user = userEvent.setup();
      await render(Toolbar.Root, {
        children: (
          <Toolbar.Group>
            <ToggleGroup.Root data-testid="toggle-group" defaultValue={['one']}>
              <Toggle.Root value="one">One</Toggle.Root>
              <Toggle.Root value="two">Two</Toggle.Root>
            </ToggleGroup.Root>
          </Toolbar.Group>
        ),
      });

      const group = screen.getByTestId('toggle-group');
      const [button1, button2] = screen.getAllByRole('button');

      expect(group).not.toHaveAttribute('data-multiple');
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      expect(button2).toHaveAttribute('aria-pressed', 'false');

      await user.keyboard('[Tab][ArrowRight]');
      expect(button2).toHaveFocus();

      await user.pointer({keys: '[MouseLeft]', target: button2});
      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(button2).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
