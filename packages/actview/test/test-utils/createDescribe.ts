import { describe } from 'vitest';

/**
 * A custom `describe` function with chainable `skip` and `only` methods.
 *
 * Ported from `@mui/internal-test-utils/createDescribe`: it groups a set of
 * tests under a fixed message while still allowing the whole group to be
 * focused (`describe.only`) or skipped (`describe.skip`) from the call site.
 * Used to group conformance tests per component.
 *
 * @param message - The message to display for the describe block.
 * @param callback - The callback function containing the tests; receives the
 *   arguments passed to the returned describe function.
 */
export default function createDescribe(message: string, callback: (...args: any[]) => void) {
  const muiDescribe = ((...args: any[]) => {
    describe(message, () => {
      callback(...args);
    });
  }) as CustomDescribe;

  muiDescribe.skip = (...args: any[]) => {
    describe.skip(message, () => {
      callback(...args);
    });
  };

  muiDescribe.only = (...args: any[]) => {
    describe.only(message, () => {
      callback(...args);
    });
  };

  return muiDescribe;
}

export interface CustomDescribe {
  (...args: any[]): void;
  skip: (...args: any[]) => void;
  only: (...args: any[]) => void;
}
