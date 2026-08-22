import { describe, expect, it } from 'vitest';
import { MeterRoot } from '@/meter/root/MeterRoot';
import { MeterTrack } from '@/meter/track/MeterTrack';
import { createRenderer } from '#/test/createRenderer';

const { render } = createRenderer();

function MeterWithTrack(props: any) {
  return (
    <MeterRoot {...props}>
      <MeterTrack data-testid="track" />
    </MeterRoot>
  );
}

describe('<Meter.Track />', () => {
  it('renders a div element inside the meter', async () => {
    await render(MeterWithTrack, { value: 30 });

    const track = document.querySelector('[data-testid="track"]') as HTMLElement;
    expect(track.tagName).toBe('DIV');
    expect(track.closest('[role="meter"]')).not.toBe(null);
  });
});
