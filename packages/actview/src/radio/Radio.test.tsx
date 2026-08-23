import { expect, vi } from 'vitest';
import { nextTick } from 'actview';
import { Radio } from '@/radio';
import { RadioGroup } from '@/radio-group';
import { createRenderer } from '#test-utils';
import { fireEvent, screen } from '#test-utils/rtl';

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

describe('<RadioGroup /> with <Radio.Root />', () => {
  const { render } = createRenderer();

  const Group = ({onValueChange}: {onValueChange?: (v: string, details: any) => void}) => (
    <RadioGroup onValueChange={onValueChange as any}>
      <Radio.Root value="a" children={null} />
      <Radio.Root value="b" children={null} />
    </RadioGroup>
  );

  it('selects a radio on click', async () => {
    const onValueChange = vi.fn();
    await render(Group, {onValueChange});

    const roots = document.querySelectorAll('[role="radio"]');
    fireEvent.click(roots[1]);
    await nextTick();

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBe('b');
    expect(roots[1]).toHaveAttribute('aria-checked', 'true');
    expect(roots[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('renders the group role', async () => {
    await render(Group);

    expect(document.querySelector('[role="radiogroup"]')).toBeInTheDocument();
  });

  it('shows indicator when checked', async () => {
    await render(
      RadioGroup,
      {
        defaultValue: 'a',
        children: (
          <Radio.Root value="a">
            <Radio.Indicator>●</Radio.Indicator>
          </Radio.Root>
        ),
      },
    );

    expect(screen.getByText('●')).toBeInTheDocument();
  });
});
