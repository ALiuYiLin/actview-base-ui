import { expect } from 'vitest';
import { nextTick } from 'actview';
import { Tabs } from '@/tabs';
import { createRenderer } from '#test-utils';

async function settle() {
  await nextTick();
  await nextTick();
  await nextTick();
}

describe('<Tabs.Panel />', () => {
  const { render } = createRenderer();

  it('shows the active panel', async () => {
    await render(
      Tabs.Root,
      {
        children: (
          <>
            <Tabs.List>
              <Tabs.Tab value="a" children={null} />
              <Tabs.Tab value="b" children={null} />
            </Tabs.List>
            <Tabs.Panel value="a">A panel</Tabs.Panel>
            <Tabs.Panel value="b">B panel</Tabs.Panel>
          </>
        ),
      },
    );
    await settle();

    expect(document.querySelector('[role="tabpanel"]')).toHaveTextContent('A panel');
  });
});
