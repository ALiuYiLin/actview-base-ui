import { expect } from 'vitest';
import { ScrollArea } from '@/scroll-area';
import { createRenderer } from '#test-utils';

describe('<ScrollArea />', () => {
  const { render } = createRenderer();

  const Basic = () => (
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <ScrollArea.Content>
          <div style={{width: 300, height: 300}}>Content</div>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );

  it('renders root with viewport and content', async () => {
    await render(Basic);

    expect(document.querySelector('[data-id$="-viewport"]')).toBeInTheDocument();
    expect(document.querySelector('[data-id$="-viewport"]')).toHaveTextContent('Content');
  });

  it('hides scrollbar without overflow in jsdom', async () => {
    await render(Basic);

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
