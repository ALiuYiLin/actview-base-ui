import { expect } from 'vitest';
import { Slider } from '@/slider';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Slider.Value />', () => {
  const { render } = createRenderer();

  it('shows the value in Slider.Value', async () => {
    await render(
      Slider.Root,
      {
        defaultValue: 42,
        children: (
          <Slider.Control>
            <Slider.Track><Slider.Thumb /></Slider.Track>
            <Slider.Value />
          </Slider.Control>
        ),
      },
    );

    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
