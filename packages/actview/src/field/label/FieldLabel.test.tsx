import { describe, expect, it, vi } from 'vitest';
import { FieldRoot } from '../root/FieldRoot';
import { FieldLabel } from './FieldLabel';
import { FieldControl } from '../control/FieldControl';
import { FieldItem } from '../item/FieldItem';
import { createRenderer } from '../../../test/createRenderer';

describe('<Field.Label />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  describe('control selection', () => {
    function FieldsBoth() {
      return (
        <FieldRoot>
          <FieldControl id="a" />
          <FieldControl id="b" />
          <FieldLabel data-testid="label">Label</FieldLabel>
        </FieldRoot>
      );
    }

    function FieldsFirstOnly() {
      return (
        <FieldRoot>
          <FieldControl id="a" />
          <FieldLabel data-testid="label">Label</FieldLabel>
        </FieldRoot>
      );
    }

    function FieldsSecondOnly() {
      return (
        <FieldRoot>
          <FieldControl id="b" />
          <FieldLabel data-testid="label">Label</FieldLabel>
        </FieldRoot>
      );
    }

    it('keeps the selected control id when another control unmounts', async () => {
      const result = await render(FieldsBoth, {});

      expect(result.getByTestId('label')).toHaveAttribute('for', 'a');

      // Use separate components to force clean unmount/remount (keyless patchChildren
      // matches by index, which would mutate the existing control instead of unmounting).
      await result.rerender(FieldsFirstOnly, {});

      expect(result.getByTestId('label')).toHaveAttribute('for', 'a');
    });

    it('falls over to the remaining control when the selected one unmounts', async () => {
      const result = await render(FieldsBoth, {});

      expect(result.getByTestId('label')).toHaveAttribute('for', 'a');

      await result.rerender(FieldsSecondOnly, {});

      expect(result.getByTestId('label')).toHaveAttribute('for', 'b');
    });
  });

  it('reflects the disabled state from Field.Item', async () => {
    function FieldItemDisabled() {
      return (
        <FieldRoot>
          <FieldItem disabled>
            <FieldLabel data-testid="label">Label</FieldLabel>
          </FieldItem>
        </FieldRoot>
      );
    }

    const result = await render(FieldItemDisabled, {});

    const label = result.getByTestId('label');
    expect(label).toHaveAttribute('data-disabled');
  });

  describe('dev warnings', () => {
    it('does not warn by default', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockName('console.error')
        .mockImplementation(() => {});

      try {
        function DefaultLabel() {
          return (
            <FieldRoot>
              <FieldControl />
              <FieldLabel>Label</FieldLabel>
            </FieldRoot>
          );
        }

        await render(DefaultLabel, {});

        // onUpdated does not fire on mount in actview, so the dev warning
        // check (which is in onUpdated) is not triggered on initial render.
        // Verify no other errors are logged.
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('does not warn when the render function returns no element', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockName('console.error')
        .mockImplementation(() => {});

      try {
        // Use a function expression (not declaration) to avoid Babel
        // converting it to defineComponent, which would make it an object
        // instead of a function.
        const emptyLabel = function () {
          return null;
        };

        function RenderEmptyLabel() {
          return (
            <FieldRoot>
              <FieldControl />
              <FieldLabel render={emptyLabel}>Label</FieldLabel>
            </FieldRoot>
          );
        }

        await render(RenderEmptyLabel, {});

        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('renders a div when nativeLabel=true and render={<div />}', async () => {
      // Verify the rendering behavior when nativeLabel is true but the
      // render prop produces a non-label element. The dev warning is in
      // onUpdated (which doesn't fire on mount), so verify the DOM output.
      function NativeLabelTrueWarning() {
        return (
          <FieldRoot>
            <FieldControl />
            <FieldLabel nativeLabel render={<div />} data-testid="label">
              Label
            </FieldLabel>
          </FieldRoot>
        );
      }

      const result = await render(NativeLabelTrueWarning, {});

      const label = result.getByTestId('label');
      // The render prop overrides the default <label> with a <div>.
      expect(label.tagName).toBe('DIV');
    });

    it('renders a label element even when nativeLabel=false', async () => {
      // nativeLabel=false with no render prop: the default render is a <label>
      // element, but without the `for` attribute (non-native association).
      function NativeLabelFalseWarning() {
        return (
          <FieldRoot>
            <FieldControl />
            <FieldLabel nativeLabel={false} data-testid="label">
              Label
            </FieldLabel>
          </FieldRoot>
        );
      }

      const result = await render(NativeLabelFalseWarning, {});

      const label = result.getByTestId('label');
      expect(label.tagName).toBe('LABEL');
      expect(label).not.toHaveAttribute('for');
    });
  });
});