import { expect } from 'vitest';
import { Radio } from '@/radio';
import { createRenderer } from '#test-utils';

describe('<Radio.Root /> standalone', () => {
  const { render } = createRenderer();

  it('renders a span with radio role and hidden input', async () => {
    await render(Radio.Root, {value: 'a', children: null});

    const root = document.querySelector('[role="radio"]') as HTMLElement;
    expect(root.tagName).toBe('SPAN');
    expect(root).toHaveAttribute('aria-checked', 'false');
    const input = document.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('is checked when value is empty string', async () => {
    await render(Radio.Root, {value: '', children: null});

    const root = document.querySelector('[role="radio"]') as HTMLElement;
    expect(root).toHaveAttribute('aria-checked', 'true');
  });
});
