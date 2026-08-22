/**
 * Generates a random string value (e.g. `sx8k3jf9a2`) used as a unique
 * className / testId / value in tests, so assertions that a prop was actually
 * forwarded to the DOM cannot be satisfied by a coincidental value.
 *
 * Ported from `@mui/internal-test-utils` (`describeConformance.mjs`).
 */
export function randomStringValue() {
  return `s${Math.random().toString(36).slice(2)}`;
}
