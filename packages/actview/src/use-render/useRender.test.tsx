import { describe, expect, it } from 'vitest';
import { defineComponent } from 'actview';
import { useRender } from '@/use-render';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestComponent(props: any) {
  const {render: renderProp, state, mapping, defaultTagName, refs, ...otherProps} = props;
  const element = useRender({
    render: renderProp,
    props: otherProps,
    state: (state as any) ?? ({} as any),
    stateAttributesMapping: mapping,
    ref: refs,
    defaultTagName,
  });
  return element;
}

const TestComponentDef = defineComponent(TestComponent);

describe('useRender', () => {
  it('renders div by default', async () => {
    await render(<TestComponentDef data-testid="el" />);
    await settle();

    expect(screen.getByTestId('el')).toHaveProperty('tagName', 'DIV');
  });

  it('renders the default tag with no render prop', async () => {
    await render(<TestComponentDef defaultTagName="span" data-testid="el" />);
    await settle();

    expect(screen.getByTestId('el')).toHaveProperty('tagName', 'SPAN');
  });

  it('converts state to data attributes automatically', async () => {
    await render(<TestComponentDef state={{open: true, count: 3}} data-testid="el" />);
    await settle();

    const el = screen.getByTestId('el');
    expect(el).toHaveAttribute('data-open', '');
    expect(el).toHaveAttribute('data-count', '3');
  });

  it('handles undefined and falsy values in state', async () => {
    await render(
      <TestComponentDef state={{open: undefined, count: 0, name: ''}} data-testid="el" />,
    );
    await settle();

    const el = screen.getByTestId('el');
    expect(el).not.toHaveAttribute('data-open');
    expect(el).not.toHaveAttribute('data-count');
    expect(el).not.toHaveAttribute('data-name');
  });

  it('props override state-based data attributes', async () => {
    await render(<TestComponentDef state={{open: true}} data-open="existing" data-testid="el" />);
    await settle();

    expect(screen.getByTestId('el')).toHaveAttribute('data-open', 'existing');
  });

  it('supports custom stateAttributesMapping', async () => {
    await render(
      <TestComponentDef
        state={{openState: true}}
        mapping={{
          openState: (value: any) =>
            value ? {'data-open-state': 'yes'} : {'data-open-state': 'no'},
        }}
        data-testid="el"
      />,
    );
    await settle();

    expect(screen.getByTestId('el')).toHaveAttribute('data-open-state', 'yes');
  });

  it('renders the render function with props and state', async () => {
    await render(
      <TestComponentDef
        render={(props: any, state: any) => (
          <span {...props} data-state-open={String(state.open)}>
            custom
          </span>
        )}
        state={{open: true}}
        data-testid="el"
      />,
    );
    await settle();

    const el = screen.getByTestId('el');
    expect(el).toHaveProperty('tagName', 'SPAN');
    expect(el).toHaveAttribute('data-state-open', 'true');
    expect(el).toHaveTextContent('custom');
  });

  it('refs are handled as expected', async () => {
    const refs: any[] = [{current: null}, {current: null}];
    await render(<TestComponentDef refs={refs} data-testid="el" />);
    await settle();

    const el = screen.getByTestId('el');
    refs.forEach((ref) => {
      expect(ref.current).toBe(el);
    });
  });

  it('does not overwrite className in a render function when unspecified', async () => {
    await render(
      <TestComponentDef
        render={(props: any, state: any) => (
          <span {...props} className={`my-span ${props.className ?? ''}`} {...state} />
        )}
        data-testid="el"
      />,
    );
    await settle();

    expect(screen.getByTestId('el')).toHaveAttribute('class', 'my-span ');
  });
});
