import { expectType } from '#test-utils';
import { Avatar, type ImageLoadingStatus } from '@/avatar';

// `Avatar.Image` accepts and forwards the native responsive/loading `<img>` props.
// （actview 版：render prop 是单参数合并对象（element props + state + ref），
// 见 MIGRATION.md case 2——state 字段直接挂在参数对象上。）
<Avatar.Root
  render={(props) => {
    expectType<ImageLoadingStatus, typeof props.imageLoadingStatus>(props.imageLoadingStatus);
    return <span {...props} />;
  }}
>
  <Avatar.Image
    crossOrigin="anonymous"
    referrerPolicy="no-referrer"
    sizes="48px"
    srcSet="avatar.png 1x, avatar@2x.png 2x"
    onLoadingStatusChange={(status) => {
      expectType<ImageLoadingStatus, typeof status>(status);
    }}
    render={(props) => {
      expectType<string | undefined, typeof props.src>(props.src);
      expectType<string | undefined, typeof props.alt>(props.alt);
      expectType<ImageLoadingStatus, typeof props.imageLoadingStatus>(props.imageLoadingStatus);
      return <img alt="" {...props} />;
    }}
  />
  <Avatar.Fallback
    delay={100}
    render={(props) => {
      expectType<ImageLoadingStatus, typeof props.imageLoadingStatus>(props.imageLoadingStatus);
      return <span {...props} />;
    }}
  />
</Avatar.Root>;
