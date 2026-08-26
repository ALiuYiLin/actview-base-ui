import { expect } from 'vitest';
import { Checkbox } from '@/checkbox';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Checkbox.Indicator />', () => {
  const { render } = createRenderer();

  it('renders when checked', async () => {
    await render(
      Checkbox.Root,
      {checked: true, children: <Checkbox.Indicator>✓</Checkbox.Indicator>},
    );

    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('does not render when unchecked without keepMounted', async () => {
    await render(
      Checkbox.Root,
      {children: <Checkbox.Indicator>✓</Checkbox.Indicator>},
    );

    expect(screen.queryByText('✓')).toBeNull();
  });
});
