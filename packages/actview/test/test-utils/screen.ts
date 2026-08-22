export { screen } from '@actview/testing';

/**
 * Global query entry point (getByTestId / queryByTestId / getByText / ...).
 *
 * ActView's `screen` from `@actview/testing` is scoped to the **most recently
 * rendered container** (unlike MUI's, which is bound to `document.body`), which
 * matches how actview tests query — after `await render(...)` the queries
 * resolve against the freshly mounted tree.
 */
