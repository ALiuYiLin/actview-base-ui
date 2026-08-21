import { describe, expect, it, vi } from 'vitest';
import { AvatarRoot } from '../root/AvatarRoot';
import { AvatarImage } from './AvatarImage';
import { AvatarFallback } from '../fallback/AvatarFallback';
import { createRenderer } from '../../../test/createRenderer';

type MockImage = {
  complete: boolean;
  naturalWidth: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  referrerPolicy: string;
  crossOrigin: string | null;
  sizes: string;
  src: string;
  srcset: string;
};

/**
 * When `completeOnSet` is true, simulates cached-image behavior: setting a
 * source immediately marks the image as complete before an async load event.
 */
function mockImageLoading({ completeOnSet = false, naturalWidth = 100 } = {}) {
  const OriginalImage = window.Image;
  const images: MockImage[] = [];

  window.Image = function MockImage() {
    let srcValue = '';
    let srcSetValue = '';
    const obj: MockImage = {
      complete: false,
      naturalWidth: 0,
      onload: null,
      onerror: null,
      referrerPolicy: '',
      crossOrigin: null,
      sizes: '',
      get src() {
        return srcValue;
      },
      set src(value: string) {
        srcValue = value;
        if (completeOnSet) {
          obj.complete = true;
          obj.naturalWidth = naturalWidth;
        }
      },
      get srcset() {
        return srcSetValue;
      },
      set srcset(value: string) {
        srcSetValue = value;
        if (completeOnSet) {
          obj.complete = true;
          obj.naturalWidth = naturalWidth;
        }
      },
    };
    images.push(obj);
    return obj;
  } as unknown as typeof window.Image;

  return {
    images,
    restore() {
      window.Image = OriginalImage;
    },
  };
}

describe('<Avatar.Image />', () => {
  const { render, fireEvent, act, waitFor } = createRenderer();

  let restoreImage: () => void;

  function installImageMock(options?: Parameters<typeof mockImageLoading>[0]) {
    restoreImage();
    const imageMock = mockImageLoading(options);
    restoreImage = imageMock.restore;
    return imageMock;
  }

  beforeEach(() => {
    restoreImage = mockImageLoading({ completeOnSet: true }).restore;
  });

  afterEach(() => {
    restoreImage();
  });

  it('passes native image props to the rendered image', async () => {
    function Demo() {
      return (
        <AvatarRoot>
          <AvatarImage
            crossOrigin="anonymous"
            data-testid="image"
            referrerPolicy="no-referrer"
            sizes="48px"
            src="avatar.png"
            srcSet="avatar.png 1x, avatar@2x.png 2x"
          />
        </AvatarRoot>
      );
    }

    const result = await render(Demo, {});

    const image = result.getByTestId('image');
    expect(image).toHaveAttribute('crossorigin', 'anonymous');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(image).toHaveAttribute('sizes', '48px');
    expect(image).toHaveAttribute('srcset', 'avatar.png 1x, avatar@2x.png 2x');
  });

  it('shows the image when only srcSet is provided', async () => {
    function Demo() {
      return (
        <AvatarRoot>
          <AvatarImage data-testid="image" sizes="48px" srcSet="avatar.png 1x" />
          <AvatarFallback>JD</AvatarFallback>
        </AvatarRoot>
      );
    }

    const result = await render(Demo, {});

    expect(result.getByTestId('image')).toHaveAttribute('srcset', 'avatar.png 1x');
    expect(result.queryByText('JD')).toBe(null);
  });

  it('passes responsive image props to the loading probe', async () => {
    const imageMock = installImageMock();

    function Demo() {
      return (
        <AvatarRoot>
          <AvatarImage sizes="48px" src="fallback.png" srcSet="avatar.png 1x, avatar@2x.png 2x" />
        </AvatarRoot>
      );
    }

    await render(Demo, {});

    expect(imageMock.images[0].sizes).toBe('48px');
    expect(imageMock.images[0].srcset).toBe('avatar.png 1x, avatar@2x.png 2x');
    expect(imageMock.images[0].src).toBe('fallback.png');
  });

  describe('prop: onLoadingStatusChange', () => {
    it('fires when the image loads', async () => {
      const imageMock = installImageMock();
      const onLoadingStatusChange = vi.fn();

      function Demo() {
        return (
          <AvatarRoot>
            <AvatarImage src="avatar.png" onLoadingStatusChange={onLoadingStatusChange} />
          </AvatarRoot>
        );
      }

      await render(Demo, {});

      await waitFor(() => {
        expect(onLoadingStatusChange).toHaveBeenCalledWith('loading');
      });

      await act(async () => {
        imageMock.images.at(-1)?.onload?.();
      });

      await waitFor(() => {
        expect(onLoadingStatusChange.mock.calls.map(([status]: [string]) => status)).toEqual([
          'loading',
          'loaded',
        ]);
      });
    });

    it('fires when the image errors', async () => {
      const imageMock = installImageMock();
      const onLoadingStatusChange = vi.fn();

      function Demo() {
        return (
          <AvatarRoot>
            <AvatarImage src="avatar.png" onLoadingStatusChange={onLoadingStatusChange} />
          </AvatarRoot>
        );
      }

      await render(Demo, {});

      await waitFor(() => {
        expect(onLoadingStatusChange).toHaveBeenCalledWith('loading');
      });

      await act(async () => {
        imageMock.images.at(-1)?.onerror?.();
      });

      await waitFor(() => {
        expect(onLoadingStatusChange.mock.calls.map(([status]: [string]) => status)).toEqual([
          'loading',
          'error',
        ]);
      });
    });

    it('fires for cached image errors without emitting idle', async () => {
      installImageMock({ completeOnSet: true, naturalWidth: 0 });
      const onLoadingStatusChange = vi.fn();

      function Demo() {
        return (
          <AvatarRoot>
            <AvatarImage src="avatar.png" onLoadingStatusChange={onLoadingStatusChange} />
          </AvatarRoot>
        );
      }

      await render(Demo, {});

      await waitFor(() => {
        expect(onLoadingStatusChange).toHaveBeenCalledWith('error');
      });

      expect(onLoadingStatusChange).not.toHaveBeenCalledWith('idle');
    });
  });

  it('shows the image immediately for a cached src', async () => {
    function Demo() {
      return (
        <AvatarRoot>
          <AvatarImage src="https://example.com/cached-avatar.png" alt="Jane Doe" />
          <AvatarFallback>JD</AvatarFallback>
        </AvatarRoot>
      );
    }

    const result = await render(Demo, {});

    const image = result.getByRole
      ? result.getByRole('img')
      : document.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://example.com/cached-avatar.png');
    expect(result.queryByText('JD')).toBe(null);
  });
});