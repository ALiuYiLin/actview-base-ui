import { expect } from 'vitest';
import { ScrollArea } from '@/scroll-area';
import { createRenderer } from '#test-utils';

describe('<ScrollArea.Scrollbar />', () => {
  const { render } = createRenderer();

  it('hides scrollbar without overflow in jsdom', async () => {
    await render(
      ScrollArea.Root,
      {
        children: (
          <>
            <ScrollArea.Viewport>
              <ScrollArea.Content>Content</ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar>
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </>
        ),
      },
    );

    const scrollbar = document.querySelector('[data-id$="-scrollbar"]');
    expect(scrollbar).toBeNull();
  });

  it('renders scrollbar with keepMounted', async () => {
    await render(
      ScrollArea.Root,
      {
        children: (
          <>
            <ScrollArea.Viewport>
              <ScrollArea.Content>Content</ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar keepMounted>
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </>
        ),
      },
    );

    const scrollbar = document.querySelector('[data-id$="-scrollbar"]');
    expect(scrollbar).toBeInTheDocument();
  });
});
