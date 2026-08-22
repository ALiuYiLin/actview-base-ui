import { describe, expect, it, vi, beforeAll } from 'vitest';
import { AccordionRoot } from '@/accordion/root/AccordionRoot';
import { AccordionItem } from '@/accordion/item/AccordionItem';
import { AccordionHeader } from '@/accordion/header/AccordionHeader';
import { AccordionTrigger } from '@/accordion/trigger/AccordionTrigger';
import { AccordionPanel } from '@/accordion/panel/AccordionPanel';
import { createRenderer } from '#/test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

function SimpleAccordion(props: any) {
  return (
    <AccordionRoot data-testid="root" {...props}>
      <AccordionItem value="a" data-testid="item-a">
        <AccordionHeader>
          <AccordionTrigger data-testid="trigger-a">Trigger A</AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel data-testid="panel-a">Panel A</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="b" data-testid="item-b">
        <AccordionHeader>
          <AccordionTrigger data-testid="trigger-b">Trigger B</AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel data-testid="panel-b">Panel B</AccordionPanel>
      </AccordionItem>
    </AccordionRoot>
  );
}

function DisabledItem(props: any) {
  return (
    <AccordionRoot {...props}>
      <AccordionItem value="a" disabled>
        <AccordionHeader>
          <AccordionTrigger data-testid="trigger-a">A</AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel>Panel A</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionHeader>
          <AccordionTrigger data-testid="trigger-b">B</AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel>Panel B</AccordionPanel>
      </AccordionItem>
    </AccordionRoot>
  );
}

function ManualPanelId(props: any) {
  return (
    <AccordionRoot defaultValue={['a']} {...props}>
      <AccordionItem value="a">
        <AccordionHeader>
          <AccordionTrigger data-testid="trigger">Trigger</AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel id="custom-panel-id" data-testid="panel">
          Panel
        </AccordionPanel>
      </AccordionItem>
    </AccordionRoot>
  );
}

function ManualTriggerId(props: any) {
  return (
    <AccordionRoot defaultValue={['a']} {...props}>
      <AccordionItem value="a">
        <AccordionHeader>
          <AccordionTrigger id="custom-trigger-id" data-testid="trigger">
            Trigger
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel data-testid="panel">Panel</AccordionPanel>
      </AccordionItem>
    </AccordionRoot>
  );
}

describe('<Accordion />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  it('renders with correct ARIA associations', async () => {
    const result = await render(SimpleAccordion, { defaultValue: ['a'] });

    const trigger = result.getByTestId('trigger-a') as HTMLButtonElement;
    const panel = result.getByTestId('panel-a') as HTMLElement;

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-controls');
    });

    expect(panel).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
    expect(panel).toHaveAttribute('role', 'region');
    expect(trigger).toHaveAttribute('id', panel.getAttribute('aria-labelledby'));
  });

  it('opens the panel when the trigger is clicked (uncontrolled)', async () => {
    const result = await render(SimpleAccordion, {});

    const trigger = result.getByTestId('trigger-a') as HTMLButtonElement;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(result.queryByTestId('panel-a')).toBe(null);

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(result.getByTestId('panel-a')).not.toBe(null);
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the panel when the trigger is clicked again', async () => {
    const result = await render(SimpleAccordion, { defaultValue: ['a'] });

    await waitFor(() => {
      expect(result.getByTestId('panel-a')).not.toBe(null);
    });

    const trigger = result.getByTestId('trigger-a') as HTMLButtonElement;
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(result.queryByTestId('panel-a')).toBe(null);
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('only one panel is open by default (single mode)', async () => {
    const result = await render(SimpleAccordion, { defaultValue: ['a'] });

    await waitFor(() => {
      expect(result.getByTestId('panel-a')).not.toBe(null);
    });
    expect(result.queryByTestId('panel-b')).toBe(null);

    // Opening B closes A
    const triggerB = result.getByTestId('trigger-b') as HTMLButtonElement;
    fireEvent.click(triggerB);
    await waitFor(() => {
      expect(result.getByTestId('panel-b')).not.toBe(null);
      expect(result.queryByTestId('panel-a')).toBe(null);
    });
  });

  it('allows multiple open panels when multiple is true', async () => {
    const result = await render(SimpleAccordion, { multiple: true });

    fireEvent.click(result.getByTestId('trigger-a'));
    await waitFor(() => {
      expect(result.getByTestId('panel-a')).not.toBe(null);
    });

    fireEvent.click(result.getByTestId('trigger-b'));
    await waitFor(() => {
      expect(result.getByTestId('panel-b')).not.toBe(null);
    });

    expect(result.getByTestId('panel-a')).not.toBe(null);
    expect(result.getByTestId('panel-b')).not.toBe(null);
  });

  it('fires onValueChange with the new value', async () => {
    const onValueChange = vi.fn();
    const result = await render(SimpleAccordion, { onValueChange });

    fireEvent.click(result.getByTestId('trigger-a'));
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
    expect(onValueChange.mock.calls[0][0]).toEqual(['a']);
    expect(onValueChange.mock.calls[0][1].reason).toBe('trigger-press');
  });

  it('supports controlled value', async () => {
    const onValueChange = vi.fn();
    const result = await render(SimpleAccordion, { value: ['a'], onValueChange });

    await waitFor(() => {
      expect(result.getByTestId('panel-a')).not.toBe(null);
    });

    // Controlled: DOM reflects the prop value until the parent updates it.
    fireEvent.click(result.getByTestId('trigger-b'));
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
    expect(onValueChange.mock.calls[0][0]).toEqual(['b']);
    // A stays open because the parent did not update the value
    expect(result.getByTestId('panel-a')).not.toBe(null);
    expect(result.queryByTestId('panel-b')).toBe(null);
  });

  it('disabled accordion does not respond to clicks', async () => {
    const result = await render(SimpleAccordion, { disabled: true });

    fireEvent.click(result.getByTestId('trigger-a'));
    await act(() => {});
    expect(result.queryByTestId('panel-a')).toBe(null);
  });

  it('disabled item does not respond to clicks', async () => {
    const result = await render(DisabledItem, {});

    fireEvent.click(result.getByTestId('trigger-a'));
    await act(() => {});
    expect(result.queryByText('Panel A')).toBe(null);

    fireEvent.click(result.getByTestId('trigger-b'));
    await waitFor(() => {
      expect(result.queryByText('Panel B')).not.toBe(null);
    });
  });

  it('manual panel id is referenced in aria-controls', async () => {
    const result = await render(ManualPanelId, {});

    await waitFor(() => {
      expect(result.getByTestId('trigger')).toHaveAttribute(
        'aria-controls',
        'custom-panel-id',
      );
    });
    expect(result.getByTestId('panel')).toHaveAttribute('id', 'custom-panel-id');
  });

  it('manual trigger id is referenced in panel aria-labelledby', async () => {
    const result = await render(ManualTriggerId, {});

    await waitFor(() => {
      expect(result.getByTestId('panel')).toHaveAttribute(
        'aria-labelledby',
        'custom-trigger-id',
      );
    });
  });
});
