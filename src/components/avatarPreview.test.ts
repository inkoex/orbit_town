import { getAvatarPreviewLayout } from './avatarPreview';

describe('getAvatarPreviewLayout', () => {
  test('scales the frame and atlas coordinates together', () => {
    expect(getAvatarPreviewLayout('s1', 2)).toMatchObject({
      width: 64,
      height: 64,
      backgroundPosition: '-0px -0px',
      backgroundSize: '768px 512px',
    });

    expect(getAvatarPreviewLayout('s6', 2)).toMatchObject({
      width: 64,
      height: 64,
      backgroundPosition: '-192px -256px',
      backgroundSize: '768px 512px',
    });
  });

  test('returns undefined for an unknown character', () => {
    expect(getAvatarPreviewLayout('missing')).toBeUndefined();
  });
});
