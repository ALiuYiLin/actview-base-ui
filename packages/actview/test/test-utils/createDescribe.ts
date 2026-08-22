import { describe } from 'vitest';

/**
 * A custom `describe` function with chainable `skip` and `only` methods.
 *
 * Ported from `@mui/internal-test-utils/createDescribe`: it groups a set of
 * tests under a fixed message while still allowing the whole group to be
 * focused (`describe.only`) or skipped (`describe.skip`) from the call site.
 * Used to group conformance tests per component.
 *
 * The `Args` generic keeps the returned describe callable's parameter types
 * intact, so call sites keep contextual typing (e.g. `describeConformance`
 * options' `render` callback parameter is inferred instead of `any`).
 *
 * @param message - The message to display for the describe block.
 * @param callback - The callback function containing the tests; receives the
 *   arguments passed to the returned describe function.
 */
export default function createDescribe<Args extends unknown[]>(
  message: string,
  callback: (...args: Args) => void,
) {
  const muiDescribe = ((...args: Args) => {
    describe(message, () => {
      callback(...args);
    });
  }) as CustomDescribe<Args>;

  muiDescribe.skip = (...args: Args) => {
    describe.skip(message, () => {
      callback(...args);
    });
  };

  muiDescribe.only = (...args: Args) => {
    describe.only(message, () => {
      callback(...args);
    });
  };

  return muiDescribe;
}

export interface CustomDescribe<Args extends unknown[] = any[]> {
  (...args: Args): void;
  skip: (...args: Args) => void;
  only: (...args: Args) => void;
}
