import { describe, expect, it } from 'vitest';
import { createRenderer } from './createRenderer';

describe('createRenderer', () => {
  const { render } = createRenderer();

  it('renders with props and re-renders via setProps', async () => {
    function Greeting(props: { name?: string }) {
      return <span data-testid="g">hi {props.name}</span>;
    }
    const result = await render(Greeting, { name: 'a' });
    expect(result.getByTestId('g').textContent).toBe('hi a');
    await result.setProps({ name: 'b' });
    expect(result.getByTestId('g').textContent).toBe('hi b');
  });

  it('rerender switches component', async () => {
    function A() {
      return <span data-testid="g">A</span>;
    }
    function B() {
      return <span data-testid="g">B</span>;
    }
    const result = await render(A);
    expect(result.getByTestId('g').textContent).toBe('A');
    await result.rerender(B);
    expect(result.getByTestId('g').textContent).toBe('B');
  });

  it('fireEvent facade dispatches key events', async () => {
    const { fireEvent } = createRenderer();
    let pressed = '';
    function KeyCatcher() {
      return (
        <input
          data-testid="i"
          onKeyDown={(e) => {
            pressed = e.key;
          }}
        />
      );
    }
    const result = await render(KeyCatcher);
    fireEvent.keyDown(result.getByTestId('i'), { key: 'Enter' });
    expect(pressed).toBe('Enter');
  });
});
