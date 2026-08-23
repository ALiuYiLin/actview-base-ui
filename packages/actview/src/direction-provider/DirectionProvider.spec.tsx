import { expectType } from '#test-utils';
import type { ComputedRef } from 'actview';
import {
  DirectionProvider,
  useDirection,
  type DirectionProviderProps,
  type TextDirection,
} from '@/direction-provider';

// actview 版 useDirection 返回 ComputedRef（setup 取、render 读 .value——AD-42）
const direction = null as unknown as ReturnType<typeof useDirection>;

expectType<ComputedRef<TextDirection>, typeof direction>(direction);

const props: DirectionProviderProps = {
  direction: 'rtl',
  children: <div />,
};

expectType<TextDirection | undefined, typeof props.direction>(props.direction);

<DirectionProvider />;
<DirectionProvider direction="ltr" />;
<DirectionProvider direction="rtl" />;

const invalidDirection = (
  // @ts-expect-error
  <DirectionProvider direction="vertical" />
);
