import { getAvatarPreviewLayout, getIsoAvatarPreviewUrl } from './avatarPreview';

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

describe('getIsoAvatarPreviewUrl', () => {
  test('maps registered iso avatars to their front idle frame', () => {
    expect(getIsoAvatarPreviewUrl('iso-agent-3')).toBe(
      '/ai-town/assets/iso-slice/iso-agent-3/character-sw-idle.png',
    );
    expect(getIsoAvatarPreviewUrl('iso-agent')).toBe(
      '/ai-town/assets/iso-slice/iso-agent/character-sw-idle.png',
    );
  });

  test('returns undefined for non-iso characters', () => {
    expect(getIsoAvatarPreviewUrl('f1')).toBeUndefined();
    expect(getIsoAvatarPreviewUrl('missing')).toBeUndefined();
  });
});
