import { describe, expect, it } from 'vitest';
import { ToolbarRoot } from '@/toolbar/root/ToolbarRoot';
import { ToolbarGroup } from '@/toolbar/group/ToolbarGroup';
import { ToolbarButton } from '@/toolbar/button/ToolbarButton';
import { ToolbarLink } from '@/toolbar/link/ToolbarLink';
import { ToolbarInput } from '@/toolbar/input/ToolbarInput';
import { createRenderer } from '#/test/createRenderer';

const { render } = createRenderer();

function ToolbarWithGroup(props: any) {
  return (
    <ToolbarRoot>
      <ToolbarGroup {...props} data-testid="group">
        <ToolbarButton data-testid="button" />
        <ToolbarLink href="https://base-ui.com" data-testid="link">
          Link
        </ToolbarLink>
        <ToolbarInput defaultValue="" data-testid="input" />
      </ToolbarGroup>
    </ToolbarRoot>
  );
}

describe('<ToolbarGroup />', () => {
  it('renders a group', async () => {
    await render(ToolbarWithGroup, {});

    const group = document.querySelector('[data-testid="group"]');
    expect(group).not.toBe(null);
    expect(group).toHaveAttribute('role', 'group');
  });

  it('prop: disabled disables all toolbar items except links in the group', async () => {
    await render(ToolbarWithGroup, { disabled: true });

    const button = document.querySelector('[data-testid="button"]') as HTMLElement;
    const input = document.querySelector('[data-testid="input"]') as HTMLElement;
    const link = document.querySelector('[data-testid="link"]') as HTMLElement;

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('data-disabled');
    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input).toHaveAttribute('data-disabled');
    expect(link).not.toHaveAttribute('data-disabled');
    expect(link).not.toHaveAttribute('aria-disabled');
  });
});
