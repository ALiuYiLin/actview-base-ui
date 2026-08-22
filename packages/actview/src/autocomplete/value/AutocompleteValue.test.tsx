import { describe, expect, it } from 'vitest';
import { AutocompleteValue } from '@/autocomplete/value/AutocompleteValue';
import { ComboboxInputValueContext } from '@/combobox/root/ComboboxRootContext';
import { createRenderer } from '#/test/createRenderer';

describe('<Autocomplete.Value />', () => {
  const { render } = createRenderer();

  describe('prop: children', () => {
    it('renders current input value', async () => {
      function Demo() {
        return (
          <ComboboxInputValueContext.Provider value="hello">
            <AutocompleteValue />
          </ComboboxInputValueContext.Provider>
        );
      }

      const result = await render(Demo, {});
      expect(result.container.textContent).toContain('hello');
    });

    it('renders function child with the input value', async () => {
      function Demo() {
        return (
          <ComboboxInputValueContext.Provider value="hel">
            <AutocompleteValue>
              {(val: string) => <span data-testid="value">{val}</span>}
            </AutocompleteValue>
          </ComboboxInputValueContext.Provider>
        );
      }

      const result = await render(Demo, {});
      const value = result.getByTestId('value');
      expect(value).toHaveTextContent('hel');
    });

    it('renders function child with empty string when no value typed', async () => {
      function Demo() {
        return (
          <ComboboxInputValueContext.Provider value="">
            <AutocompleteValue>
              {(val: string) => <span data-testid="value">{val === '' ? 'empty' : String(val)}</span>}
            </AutocompleteValue>
          </ComboboxInputValueContext.Provider>
        );
      }

      const result = await render(Demo, {});
      const value = result.getByTestId('value');
      expect(value).toHaveTextContent('empty');
    });

    it('renders static children', async () => {
      function Demo() {
        return (
          <ComboboxInputValueContext.Provider value="test-value">
            <AutocompleteValue>Custom Display Text</AutocompleteValue>
          </ComboboxInputValueContext.Provider>
        );
      }

      const result = await render(Demo, {});
      expect(result.container.textContent).toContain('Custom Display Text');
    });
  });
});