import { describe, expect, it } from 'vitest';
import { FieldRoot } from '@/field/root/FieldRoot';
import { FieldDescription } from '@/field/description/FieldDescription';
import { FieldControl } from '@/field/control/FieldControl';
import { FieldItem } from '@/field/item/FieldItem';
import { createRenderer } from '../../../test/createRenderer';

describe('<Field.Description />', () => {
  const { render } = createRenderer();

  it('should set aria-describedby on the control automatically', async () => {
    function Demo() {
      return (
        <FieldRoot>
          <FieldControl data-testid="control" />
          <FieldDescription data-testid="description">Message</FieldDescription>
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const control = result.getByTestId('control') as HTMLInputElement;
    const description = result.getByTestId('description');
    expect(control).toHaveAttribute('aria-describedby', description.id);
  });

  it('should preserve user aria-describedby values on the control', async () => {
    function Demo() {
      return (
        <FieldRoot>
          <FieldControl aria-describedby="external-description" data-testid="control" />
          <FieldDescription data-testid="description">Message</FieldDescription>
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const control = result.getByTestId('control') as HTMLInputElement;
    const description = result.getByTestId('description');
    expect(control.getAttribute('aria-describedby')).toBe(
      `external-description ${description.id}`,
    );
  });

  it('does not register an empty description id', async () => {
    function Demo() {
      return (
        <FieldRoot>
          <FieldControl aria-describedby="external-description" data-testid="control" />
          <FieldDescription id="">Message</FieldDescription>
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const control = result.getByTestId('control') as HTMLInputElement;
    expect(control).toHaveAttribute('aria-describedby', 'external-description');
  });

  it('reflects the disabled state from Field.Item', async () => {
    function Demo() {
      return (
        <FieldRoot>
          <FieldItem disabled>
            <FieldDescription data-testid="description">Message</FieldDescription>
          </FieldItem>
        </FieldRoot>
      );
    }

    const result = await render(Demo, {});

    const description = result.getByTestId('description');
    expect(description).toHaveAttribute('data-disabled');
  });
});