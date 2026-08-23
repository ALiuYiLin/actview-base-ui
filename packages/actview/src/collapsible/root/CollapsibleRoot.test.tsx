import { expect, vi } from 'vitest';
import { defineComponent, ref } from '@actview/core';
import { screen, userEvent } from '#test-utils/rtl';
import { Collapsible } from '@/collapsible';
import { createRenderer, describeConformance } from '#test-utils';
import { isJSDOM } from '@floating-ui/actview/utils';
import { REASONS } from '@/internals/reasons';

const PANEL_CONTENT = 'This is panel content';

describe('<Collapsible.Root />', () => {
  const { render } = createRenderer();

  describeConformance(<Collapsible.Root />, () => ({
    render: (node) => render(node.type, {...node.props}),
    refInstanceof: window.HTMLDivElement,
  }));

  describe('ARIA attributes', () => {
    it('sets ARIA attributes', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger />
            <Collapsible.Panel data-testid="panel" />
          </Collapsible.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');
      const panel = screen.getByTestId('panel');

      expect(trigger).toHaveAttribute('aria-expanded');
      expect(trigger).toHaveAttribute('aria-controls');
      expect(trigger.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
    });

    it('references manual panel id in trigger aria-controls', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger />
            <Collapsible.Panel id="custom-panel-id" data-testid="panel" />
          </Collapsible.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');
      const panel = screen.getByTestId('panel');

      expect(trigger).toHaveAttribute('aria-controls', 'custom-panel-id');
      expect(panel).toHaveAttribute('id', 'custom-panel-id');
    });

    it('unregisters and restores the generated panel id when the panel remounts', async () => {
      const App = defineComponent(function (props: {panelMounted: boolean}) {
        return () => (
          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger />
            {props.panelMounted && <Collapsible.Panel data-testid="panel" />}
          </Collapsible.Root>
        );
      });

      const result = await render(App, {panelMounted: true});
      const trigger = screen.getByRole('button');

      await result.setProps({panelMounted: false});
      expect(trigger).not.toHaveAttribute('aria-controls');

      await result.setProps({panelMounted: true});
      expect(trigger).toHaveAttribute('aria-controls', screen.getByTestId('panel').id);
    });
  });

  describe('collapsible status', () => {
    it('disabled status', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root disabled>
            <Collapsible.Trigger />
            <Collapsible.Panel data-testid="panel" />
          </Collapsible.Root>
        );
      });

      await render(Test);

      const trigger = screen.getByRole('button');

      expect(trigger).toHaveAttribute('data-disabled');
    });

    it('does not toggle or call onOpenChange when clicked while disabled', async () => {
      const handleOpenChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root disabled onOpenChange={handleOpenChange}>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button', {name: 'Trigger'});

      await user.click(trigger);

      expect(handleOpenChange).not.toHaveBeenCalled();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
    });
  });

  describe('BaseUIChangeEventDetails', () => {
    it('calls onOpenChange with eventDetails', async () => {
      const handleOpenChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root onOpenChange={handleOpenChange}>
            <Collapsible.Trigger>Toggle</Collapsible.Trigger>
            <Collapsible.Panel>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button', {name: 'Toggle'});
      await user.click(trigger);

      expect(handleOpenChange.mock.calls.length).toBe(1);
      const [openArg, details] = handleOpenChange.mock.calls[0] as [boolean, any];
      expect(openArg).toBe(true);
      expect(details).not.toBe(undefined);
      expect(details.reason).toBe(REASONS.triggerPress);
      expect(details.event).toBeInstanceOf(MouseEvent);
      expect(details.isCanceled).toBe(false);
      expect(typeof details.cancel).toBe('function');
      expect(typeof details.allowPropagation).toBe('function');
    });

    it('eventDetails.cancel() prevents opening while uncontrolled', async () => {
      const handleOpenChange = vi.fn(
        (_nextOpen: boolean, eventDetails: Collapsible.Root.ChangeEventDetails) => {
          eventDetails.cancel();
        },
      );

      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root onOpenChange={handleOpenChange}>
            <Collapsible.Trigger>Toggle</Collapsible.Trigger>
            <Collapsible.Panel>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button', {name: 'Toggle'});
      await user.click(trigger);

      expect(handleOpenChange).toHaveBeenCalledOnce();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
    });

    it('eventDetails.cancel() prevents closing while uncontrolled', async () => {
      const handleOpenChange = vi.fn(
        (_nextOpen: boolean, eventDetails: Collapsible.Root.ChangeEventDetails) => {
          eventDetails.cancel();
        },
      );

      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root defaultOpen onOpenChange={handleOpenChange}>
            <Collapsible.Trigger>Toggle</Collapsible.Trigger>
            <Collapsible.Panel>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button', {name: 'Toggle'});
      await user.click(trigger);

      expect(handleOpenChange).toHaveBeenCalledOnce();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByText(PANEL_CONTENT)).not.toBe(null);
    });
  });

  describe.skipIf(isJSDOM())('open state', () => {
    it('controlled trigger presses request open and close state changes', async () => {
      const App = defineComponent(function () {
        const open = ref(false);
        return () => (
          <Collapsible.Root open={open.value} onOpenChange={(v) => (open.value = v)}>
            <Collapsible.Trigger>trigger</Collapsible.Trigger>
            <Collapsible.Panel>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(App);

      const trigger = screen.getByRole('button', {name: 'trigger'});

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByText(PANEL_CONTENT)).not.toBe(null);

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
    });

    it('does not change controlled open state without an external update', async () => {
      const handleOpenChange = vi.fn();

      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root open={false} onOpenChange={handleOpenChange}>
            <Collapsible.Trigger>trigger</Collapsible.Trigger>
            <Collapsible.Panel>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button', {name: 'trigger'});

      await user.click(trigger);

      expect(handleOpenChange).toHaveBeenCalledOnce();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
    });

    it('controlled mode', async () => {
      const App = defineComponent(function () {
        const open = ref(false);
        return () => (
          <>
            <Collapsible.Root open={open.value}>
              <Collapsible.Trigger>trigger</Collapsible.Trigger>
              <Collapsible.Panel>This is panel content</Collapsible.Panel>
            </Collapsible.Root>
            <button type="button" onClick={() => (open.value = !open.value)}>
              toggle
            </button>
          </>
        );
      });
      const user = userEvent.setup();
      await render(App);

      const externalTrigger = screen.getByRole('button', {name: 'toggle'});
      const trigger = screen.getByRole('button', {name: 'trigger'});

      expect(trigger).not.toHaveAttribute('aria-controls');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);

      await user.click(externalTrigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-controls');

      expect(screen.queryByText(PANEL_CONTENT)).not.toBe(null);
      expect(screen.queryByText(PANEL_CONTENT)).toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-open');
      expect(trigger).toHaveAttribute('data-panel-open');

      await user.click(externalTrigger);

      expect(trigger).not.toHaveAttribute('aria-controls');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
    });

    it('uncontrolled mode', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root defaultOpen={false}>
            <Collapsible.Trigger />
            <Collapsible.Panel>This is panel content</Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const trigger = screen.getByRole('button');

      expect(trigger).not.toHaveAttribute('aria-controls');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);

      await user.pointer({keys: '[MouseLeft]', target: trigger});

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-controls');
      expect(screen.queryByText(PANEL_CONTENT)).not.toBe(null);
      expect(screen.queryByText(PANEL_CONTENT)).toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-open');
      expect(trigger).toHaveAttribute('data-panel-open');

      await user.pointer({keys: '[MouseLeft]', target: trigger});

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-controls');
      expect(trigger).not.toHaveAttribute('data-panel-open');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
    });
  });

  describe('state callbacks', () => {
    it('passes state to className and style callbacks', async () => {
      const Test = defineComponent(function () {
        return () => (
          <Collapsible.Root
            data-testid="root"
            className={(state: any) => (state.open ? 'root-open' : 'root-closed')}
            style={(state: any) => ({opacity: state.open ? 1 : 0.5})}
          >
            <Collapsible.Trigger
              className={(state: any) => (state.open ? 'trigger-open' : 'trigger-closed')}
              style={(state: any) => ({opacity: state.open ? 1 : 0.5})}
            >
              Trigger
            </Collapsible.Trigger>
            <Collapsible.Panel
              keepMounted
              data-testid="panel"
              className={(state: any) => (state.open ? 'panel-open' : 'panel-closed')}
              style={(state: any) => ({opacity: state.open ? 1 : 0.5})}
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        );
      });

      const user = userEvent.setup();
      await render(Test);

      const root = screen.getByTestId('root');
      const trigger = screen.getByRole('button', {name: 'Trigger'});
      const panel = screen.getByTestId('panel');

      expect(root).toHaveClass('root-closed');
      expect(root).toHaveStyle({opacity: '0.5'});
      expect(trigger).toHaveClass('trigger-closed');
      expect(trigger).toHaveStyle({opacity: '0.5'});
      expect(panel).toHaveClass('panel-closed');
      expect(panel).toHaveStyle({opacity: '0.5'});

      await user.click(trigger);

      expect(root).toHaveClass('root-open');
      expect(root).toHaveStyle({opacity: '1'});
      expect(trigger).toHaveClass('trigger-open');
      expect(trigger).toHaveStyle({opacity: '1'});
      expect(panel).toHaveClass('panel-open');
      expect(panel).toHaveStyle({opacity: '1'});
    });
  });

  describe.skipIf(isJSDOM())('keyboard interactions', () => {
    ['Enter', 'Space'].forEach((key) => {
      it(`key: ${key} does not toggle or call onOpenChange when disabled`, async () => {
        const handleOpenChange = vi.fn();

        const Test = defineComponent(function () {
          return () => (
            <Collapsible.Root disabled onOpenChange={handleOpenChange}>
              <Collapsible.Trigger>Trigger</Collapsible.Trigger>
              <Collapsible.Panel>{PANEL_CONTENT}</Collapsible.Panel>
            </Collapsible.Root>
          );
        });

        const user = userEvent.setup();
        await render(Test);

        const trigger = screen.getByRole('button');

        await user.keyboard('[Tab]');
        expect(trigger).toHaveFocus();

        await user.keyboard(`[${key}]`);

        expect(handleOpenChange).not.toHaveBeenCalled();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
      });
    });

    ['Enter', 'Space'].forEach((key) => {
      it(`key: ${key} should toggle the Collapsible`, async () => {
        const Test = defineComponent(function () {
          return () => (
            <Collapsible.Root defaultOpen={false}>
              <Collapsible.Trigger>Trigger</Collapsible.Trigger>
              <Collapsible.Panel>This is panel content</Collapsible.Panel>
            </Collapsible.Root>
          );
        });

        const user = userEvent.setup();
        await render(Test);

        const trigger = screen.getByRole('button');

        expect(trigger).not.toHaveAttribute('aria-controls');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText(PANEL_CONTENT)).toBe(null);

        await user.keyboard('[Tab]');
        expect(trigger).toHaveFocus();
        await user.keyboard(`[${key}]`);

        expect(trigger).toHaveAttribute('aria-controls');
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(trigger).toHaveAttribute('data-panel-open');
        expect(screen.queryByText(PANEL_CONTENT)).toBeVisible();
        expect(screen.queryByText(PANEL_CONTENT)).not.toBe(null);
        expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-open');

        await user.keyboard(`[${key}]`);

        expect(trigger).not.toHaveAttribute('aria-controls');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).not.toHaveAttribute('data-panel-open');
        expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
      });
    });
  });
});
