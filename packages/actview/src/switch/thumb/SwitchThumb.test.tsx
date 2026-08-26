import { expect } from 'vitest';
import { Switch } from '@/switch';
import { createRenderer } from '#test-utils';

describe('<Switch.Thumb />', () => {
  const { render } = createRenderer();

  it('renders the thumb with state attributes', async () => {
    await render(
      Switch.Root,
      {defaultChecked: true, children: (<Switch.Thumb />)},
    );

    const thumb = document.querySelector('[data-checked] span');
    expect(thumb).toBeInTheDocument();
  });
});
