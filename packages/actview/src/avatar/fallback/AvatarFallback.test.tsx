import { Mock, vi, describe, expect, it, afterEach } from 'vitest';
import { ref } from 'actview';
import { AvatarRoot } from '../root/AvatarRoot';
import { AvatarImage } from '../image/AvatarImage';
import { AvatarFallback } from './AvatarFallback';
import { useImageLoadingStatus } from '../image/useImageLoadingStatus';
import { createRenderer } from '../../../test/createRenderer';

vi.mock('../image/useImageLoadingStatus', () => ({
  useImageLoadingStatus: vi.fn(),
}));

describe('<Avatar.Fallback />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a span element (refInstanceof: HTMLSpanElement)', async () => {
    (useImageLoadingStatus as Mock).mockReturnValue(ref('error'));

    function Demo() {
      return (
        <AvatarRoot>
          <AvatarImage />
          <AvatarFallback data-testid="fallback" />
        </AvatarRoot>
      );
    }

    const result = await render(Demo, {});

    await waitFor(() => {
      const fallback = result.queryByTestId('fallback');
      expect(fallback).not.toBe(null);
      expect(fallback).toBeInstanceOf(HTMLSpanElement);
    });
  });

  it('should not render the children if the image loaded', async () => {
    (useImageLoadingStatus as Mock).mockReturnValue(ref('loaded'));

    function Demo() {
      return (
        <AvatarRoot>
          <AvatarImage />
          <AvatarFallback data-testid="fallback" />
        </AvatarRoot>
      );
    }

    const result = await render(Demo, {});

    await waitFor(() => {
      expect(result.queryByTestId('fallback')).toBe(null);
    });
  });

  it('should render the fallback if the image fails to load', async () => {
    (useImageLoadingStatus as Mock).mockReturnValue(ref('error'));

    function Demo() {
      return (
        <AvatarRoot>
          <AvatarImage />
          <AvatarFallback>AC</AvatarFallback>
        </AvatarRoot>
      );
    }

    const result = await render(Demo, {});

    await waitFor(() => {
      expect(result.queryByText('AC')).not.toBe(null);
    });
  });

  it('shows the fallback when a loaded image is unmounted', async () => {
    (useImageLoadingStatus as Mock).mockReturnValue(ref('loaded'));

    function Demo() {
      const showImage = ref(true);
      return (
        <>
          <button
            type="button"
            data-testid="hide-btn"
            onClick={() => {
              showImage.value = false;
            }}
          >
            Hide image
          </button>
          <AvatarRoot>
            {showImage.value && <AvatarImage data-testid="image" src="avatar.png" />}
            <AvatarFallback data-testid="fallback">AC</AvatarFallback>
          </AvatarRoot>
        </>
      );
    }

    const result = await render(Demo, {});

    await waitFor(() => {
      expect(result.queryByTestId('fallback')).toBe(null);
    });
    expect(result.getByTestId('image')).not.toBe(null);

    fireEvent.click(result.getByTestId('hide-btn'));
    await act(() => {});

    await waitFor(() => {
      expect(result.getByTestId('fallback')).not.toBe(null);
    });
    expect(result.queryByTestId('image')).toBe(null);
  });

  describe('prop: delay', () => {
    it('shows the fallback when the delay has elapsed', async () => {
      (useImageLoadingStatus as Mock).mockReturnValue(ref('error'));

      function Demo() {
        return (
          <AvatarRoot>
            <AvatarImage />
            <AvatarFallback delay={100}>AC</AvatarFallback>
          </AvatarRoot>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByText('AC')).toBe(null);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(result.queryByText('AC')).not.toBe(null);
    });

    it('shows the fallback immediately when delay is 0', async () => {
      (useImageLoadingStatus as Mock).mockReturnValue(ref('error'));

      function Demo() {
        return (
          <AvatarRoot>
            <AvatarImage />
            <AvatarFallback delay={0}>AC</AvatarFallback>
          </AvatarRoot>
        );
      }

      const result = await render(Demo, {});

      expect(result.queryByText('AC')).not.toBe(null);
    });

    it('shows the fallback when delay changes to 0', async () => {
      (useImageLoadingStatus as Mock).mockReturnValue(ref('error'));

      function Demo(props: { delay?: number }) {
        return (
          <AvatarRoot>
            <AvatarImage />
            <AvatarFallback delay={props.delay}>AC</AvatarFallback>
          </AvatarRoot>
        );
      }

      const { setProps } = await render(Demo, { delay: 100 });

      expect(setProps.queryByText).toBe(undefined);
      // Fallback is hidden initially due to the delay
      // Use DOM query instead
      expect(document.body.textContent).not.toContain('AC');

      await setProps({ delay: 0 });
      await act(() => {});

      expect(document.body.textContent).toContain('AC');
    });

    it('keeps the fallback visible when delay changes from undefined to a number', async () => {
      (useImageLoadingStatus as Mock).mockReturnValue(ref('error'));

      function Demo(props: { delay?: number }) {
        return (
          <AvatarRoot>
            <AvatarImage />
            <AvatarFallback delay={props.delay}>AC</AvatarFallback>
          </AvatarRoot>
        );
      }

      const { setProps } = await render(Demo, {});

      expect(document.body.textContent).toContain('AC');

      await setProps({ delay: 100 });
      await act(() => {});

      expect(document.body.textContent).toContain('AC');
    });

    it('keeps the fallback visible across a number -> undefined -> number delay change', async () => {
      (useImageLoadingStatus as Mock).mockReturnValue(ref('error'));

      function Demo(props: { delay?: number }) {
        return (
          <AvatarRoot>
            <AvatarImage />
            <AvatarFallback delay={props.delay}>AC</AvatarFallback>
          </AvatarRoot>
        );
      }

      const { setProps } = await render(Demo, { delay: 100 });

      // Fallback is hidden until the delay elapses.
      expect(document.body.textContent).not.toContain('AC');

      // Removing the delay before it elapses shows the fallback immediately.
      await setProps({ delay: undefined });
      await act(() => {});
      expect(document.body.textContent).toContain('AC');

      // Restoring the delay must not re-hide the already-visible fallback.
      await setProps({ delay: 100 });
      await act(() => {});
      expect(document.body.textContent).toContain('AC');
    });
  });

  it('keeps fallback mounted and image unmounted while the image is loading', async () => {
    const useImageLoadingStatusMock = useImageLoadingStatus as Mock;
    useImageLoadingStatusMock.mockImplementation((src: any) => {
      const srcValue = typeof src === 'function' ? src() : src;
      return ref(srcValue ? 'loading' : 'error');
    });

    function Demo() {
      const showImage = ref(false);
      return (
        <>
          <button
            type="button"
            data-testid="show-btn"
            onClick={() => {
              showImage.value = true;
            }}
          >
            Show image
          </button>
          <AvatarRoot>
            <AvatarImage data-testid="image" src={showImage.value ? 'avatar.png' : undefined} />
            <AvatarFallback data-testid="fallback">AC</AvatarFallback>
          </AvatarRoot>
        </>
      );
    }

    const result = await render(Demo, {});

    expect(result.queryByTestId('image')).toBe(null);
    expect(result.getByTestId('fallback')).not.toBe(null);

    fireEvent.click(result.getByTestId('show-btn'));
    await act(() => {});

    await waitFor(() => {
      expect(result.queryByTestId('image')).toBe(null);
      expect(result.getByTestId('fallback')).not.toBe(null);
    });
  });
});