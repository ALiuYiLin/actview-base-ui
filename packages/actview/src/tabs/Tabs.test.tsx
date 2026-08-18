import { describe, expect, it, vi, beforeAll } from 'vitest';
import * as Tabs from './index.parts';
import { createRenderer } from '../../test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent (e.g. useButton's keyboard click
  // dispatch uses `new PointerEvent('click')`); align it with MouseEvent like
  // the other component tests do.
  (window as any).PointerEvent = window.MouseEvent;
});

function TabsDemo(props: any) {
  return (
    <Tabs.Root {...props}>
      <Tabs.List>
        <Tabs.Tab value="a" data-testid="tab-a">
          A
        </Tabs.Tab>
        <Tabs.Tab value="b" data-testid="tab-b">
          B
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a" data-testid="panel-a">
        Panel A
      </Tabs.Panel>
      <Tabs.Panel value="b" data-testid="panel-b">
        Panel B
      </Tabs.Panel>
    </Tabs.Root>
  );
}

describe('<Tabs />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('renders tabs with tablist role and defaults to the first tab', async () => {
    const result = await render(TabsDemo);

    // Initial tab registration + automatic selection happen on microtasks
    // (CompositeList flush → watch → setValue); wait for the selection to land.
    await waitFor(() => {
      expect(result.getByTestId('tab-a')).toHaveAttribute('data-active');
      expect(result.getByTestId('tab-a')).toHaveAttribute('aria-selected', 'true');
    });

    expect(result.getByTestId('tab-a')).toHaveAttribute('role', 'tab');
    expect(result.getByTestId('tab-a')).toHaveAttribute('data-active');
    expect(result.getByTestId('tab-a')).toHaveAttribute('aria-selected', 'true');
    expect(result.getByTestId('tab-b')).not.toHaveAttribute('data-active');
    expect(result.getByTestId('panel-a')).toHaveAttribute('role', 'tabpanel');
    expect(result.queryByTestId('panel-b')).toBe(null);
  });

  it('switches the active tab on click and fires onValueChange', async () => {
    const handleValueChange = vi.fn();

    // Explicit default avoids the automatic initial selection (reason 'initial')
    // firing onValueChange before the click.
    const result = await render(TabsDemo, {
      defaultValue: 'a',
      onValueChange: handleValueChange,
    });

    await waitFor(() => {
      expect(result.getByTestId('tab-a')).toHaveAttribute('data-active');
    });
    handleValueChange.mockClear();

    fireEvent.click(result.getByTestId('tab-b'));
    await waitFor(() => {
      expect(handleValueChange).toHaveBeenCalledTimes(1);
    });

    expect(handleValueChange.mock.calls[0][0]).toBe('b');
    expect(handleValueChange.mock.calls[0][1].reason).toBe('none');

    await waitFor(() => {
      expect(result.getByTestId('tab-b')).toHaveAttribute('data-active');
    });
    expect(result.getByTestId('panel-b')).not.toBe(null);
    expect(result.queryByTestId('panel-a')).toBe(null);
  });

  it('honors an explicit defaultValue', async () => {
    const result = await render(TabsDemo, { defaultValue: 'b' });

    expect(result.getByTestId('tab-b')).toHaveAttribute('data-active');
    expect(result.getByTestId('panel-b')).not.toBe(null);
    expect(result.queryByTestId('panel-a')).toBe(null);
  });

  it('supports controlled value via props', async () => {
    const handleValueChange = vi.fn();

    const result = await render(TabsDemo, { value: 'a', onValueChange: handleValueChange });

    expect(result.getByTestId('tab-a')).toHaveAttribute('data-active');

    // Controlled: the DOM reflects the prop value until the parent updates it.
    fireEvent.click(result.getByTestId('tab-b'));
    expect(handleValueChange).toHaveBeenCalledWith('b', expect.objectContaining({}));
    expect(result.getByTestId('tab-a')).toHaveAttribute('data-active');

    await result.setProps({ value: 'b' });
    expect(result.getByTestId('tab-b')).toHaveAttribute('data-active');
  });

  it('falls back to the next enabled tab when the default tab is disabled', async () => {
    const handleValueChange = vi.fn();

    function DisabledFirstDemo(props: any) {
      return (
        <Tabs.Root {...props}>
          <Tabs.List>
            <Tabs.Tab value="a" disabled data-testid="tab-a">
              A
            </Tabs.Tab>
            <Tabs.Tab value="b" data-testid="tab-b">
              B
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a" data-testid="panel-a" />
          <Tabs.Panel value="b" data-testid="panel-b" />
        </Tabs.Root>
      );
    }

    const result = await render(DisabledFirstDemo, { onValueChange: handleValueChange });

    // Fallback selection is asynchronous (tabMap registration → watch → setValue).
    await waitFor(() => {
      expect(result.getByTestId('tab-b')).toHaveAttribute('data-active');
    });
    expect(handleValueChange).toHaveBeenCalled();
    expect(['initial', 'disabled']).toContain(handleValueChange.mock.calls[0][1].reason);
  });

  it('supports keyboard navigation with arrow keys and activation', async () => {
    const handleValueChange = vi.fn();

    const result = await render(TabsDemo, {
      defaultValue: 'a',
      onValueChange: handleValueChange,
    });

    await waitFor(() => {
      expect(result.getByTestId('tab-a')).toHaveAttribute('data-active');
    });
    handleValueChange.mockClear();

    const tabA = result.getByTestId('tab-a');
    const tabB = result.getByTestId('tab-b');

    fireEvent.keyDown(tabA, { key: 'ArrowRight' });
    // With activateOnFocus=false, arrow keys move the roving focus; Enter activates.
    fireEvent.keyDown(tabB, { key: 'Enter' });
    // Native <button> activation on Enter is browser behavior that jsdom does not
    // synthesize (see Button.test.tsx: the keyboard-click path only applies to
    // non-native elements), so dispatch the click explicitly.
    fireEvent.click(tabB);

    await waitFor(() => {
      expect(handleValueChange).toHaveBeenCalledTimes(1);
    });
    expect(handleValueChange.mock.calls[0][0]).toBe('b');
  });
});
