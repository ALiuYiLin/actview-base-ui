import { expect } from 'vitest';
import { ScrollArea } from '@/scroll-area';
import { createRenderer } from '#test-utils';

describe('<ScrollArea.Root />', () => {
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
});
