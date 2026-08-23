import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { Tabs } from '@/tabs';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

// actview 渲染异步 flush——自动回退/值更新后需多次 tick
async function settle() {
  await nextTick();
  await nextTick();
  await nextTick();
}

describe('<Tabs />', () => {
  const { render } = createRenderer();

  const Basic = ({onValueChange}: {onValueChange?: (v: any, d: any) => void}) => (
    <Tabs.Root onValueChange={onValueChange as any}>
      <Tabs.List>
        <Tabs.Tab value="a" children={null} />
        <Tabs.Tab value="b" children={null} />
      </Tabs.List>
      <Tabs.Panel value="a">A panel</Tabs.Panel>
      <Tabs.Panel value="b">B panel</Tabs.Panel>
    </Tabs.Root>
  );

  it('renders tablist with tabs and selects first enabled tab implicitly', async () => {
    await render(Basic);
    await settle();

    expect(document.querySelector('[role="tablist"]')).toBeInTheDocument();
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('shows the active panel', async () => {
    await render(Basic);
    await settle();

    expect(document.querySelector('[role="tabpanel"]')).toHaveTextContent('A panel');
  });

  it('activates a tab on click', async () => {
    const onValueChange = vi.fn();
    await render(Basic, {onValueChange});
    await settle();

    const tabs = document.querySelectorAll('[role="tab"]');
    fireEvent.click(tabs[1]);
    await settle();

    // 隐式 initial 通知（'a'）+ 点击（'b'）
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls[1][0]).toBe('b');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(document.querySelector('[role="tabpanel"]')).toHaveTextContent('B panel');
  });

  it('respects defaultValue', async () => {
    await render(
      Tabs.Root,
      {
        defaultValue: 'b',
        children: (
          <>
            <Tabs.List>
              <Tabs.Tab value="a" children={null} />
              <Tabs.Tab value="b" children={null} />
            </Tabs.List>
            <Tabs.Panel value="b">B panel</Tabs.Panel>
          </>
        ),
      },
    );
    await settle();

    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('is controlled via value prop', async () => {
    await render(
      Tabs.Root,
      {
        value: 'a',
        children: (
          <Tabs.List>
            <Tabs.Tab value="a" children={null} />
            <Tabs.Tab value="b" children={null} />
          </Tabs.List>
        ),
      },
    );

    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('skips disabled tabs on activation', async () => {
    await render(
      Tabs.Root,
      {
        defaultValue: 'a',
        children: (
          <>
            <Tabs.List>
              <Tabs.Tab value="a" children={null} />
              <Tabs.Tab value="b" disabled children={null} />
              <Tabs.Tab value="c" children={null} />
            </Tabs.List>
            <Tabs.Panel value="a">A</Tabs.Panel>
          </>
        ),
      },
    );
    await settle();

    const tabs = document.querySelectorAll('[role="tab"]');
    fireEvent.click(tabs[2]);
    await settle();

    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  });
});
