import { describe, expect, it } from 'vitest';
import { ProgressTrack } from '@/progress/track/ProgressTrack';
import { ProgressRoot } from '@/progress/root/ProgressRoot';
import { createRenderer } from '#/test/createRenderer';

describe('<Progress.Track />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <ProgressRoot value={50}>
          <ProgressTrack data-testid="track" />
        </ProgressRoot>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('track');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });
});