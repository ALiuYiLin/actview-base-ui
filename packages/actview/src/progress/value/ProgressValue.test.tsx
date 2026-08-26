import { expect } from 'vitest';
import { Progress } from '@/progress';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Progress.Value />', () => {
  const { render } = createRenderer();

  it('displays formatted value in Progress.Value', async () => {
    await render(
      Progress.Root,
      {value: 0.25, format: {style: 'percent'}, children: (<Progress.Value />)},
    );

    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});
