import { expect } from 'vitest';
import { nextTick } from 'actview';
import { Tabs } from '@/tabs';
import { createRenderer } from '#test-utils';
import { fireEvent } from '#test-utils/rtl';

async function settle() {
  await nextTick();
  await nextTick();
  await nextTick();
}

describe('<Tabs.Tab />', () => {
  const { render } = createRenderer();

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
