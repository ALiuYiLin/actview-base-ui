import { expect } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Field } from '@/field';
import { createRenderer, describeConformance } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Field.Root />', () => {
  const { render } = createRenderer();

  describeConformance(<Field.Root />, () => ({
    inheritComponent: 'div',
    refInstanceof: window.HTMLDivElement,
    render: (node) => render(node.type, {...(node.props ?? {})}),
  }));

  it('renders a div with data attributes', async () => {
    await render(Field.Root, {'data-testid': 'root'});

    const root = screen.getByTestId('root');
    expect(root.tagName).toBe('DIV');
    // valid 初始为 null（未验证），fieldValidityMapping 不输出 data-valid
    expect(root).not.toHaveAttribute('data-valid');
    expect(root).not.toHaveAttribute('data-invalid');
  });

  it('reflects invalid prop in data attributes', async () => {
    await render(Field.Root, {'data-testid': 'root', invalid: true});

    const root = screen.getByTestId('root');
    expect(root).toHaveAttribute('data-invalid');
    expect(root).not.toHaveAttribute('data-valid');
  });

  it('reflects disabled', async () => {
    await render(Field.Root, {'data-testid': 'root', disabled: true});

    expect(screen.getByTestId('root')).toHaveAttribute('data-disabled');
  });

  it('supports controlled dirty/touched', async () => {
    const dirty = ref(true);
    const Test = defineComponent(function () {
      return () => <Field.Root dirty={dirty.value} data-testid="root" />;
    });

    await render(Test);

    expect(screen.getByTestId('root')).toHaveAttribute('data-dirty');
  });
});
