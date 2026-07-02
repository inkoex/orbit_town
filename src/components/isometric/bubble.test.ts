import {
  BUBBLE_FRESH_MS,
  bubbleAlpha,
  debugBubbleText,
  pickLatestAuthoredMessage,
  truncateBubbleText,
  type BubbleMessage,
} from './bubble';

const msg = (author: string, text: string, t: number): BubbleMessage => ({
  author,
  text,
  messageUuid: `${author}-${t}`,
  _creationTime: t,
});

describe('pickLatestAuthoredMessage', () => {
  const messages = [msg('p:1', 'first', 100), msg('p:2', 'reply', 200), msg('p:1', 'second', 300)];

  it('returns the newest message authored by the player', () => {
    expect(pickLatestAuthoredMessage(messages, 'p:1')?.text).toBe('second');
    expect(pickLatestAuthoredMessage(messages, 'p:2')?.text).toBe('reply');
  });

  it('returns undefined when the player authored nothing', () => {
    expect(pickLatestAuthoredMessage(messages, 'p:9')).toBeUndefined();
    expect(pickLatestAuthoredMessage([], 'p:1')).toBeUndefined();
  });
});

describe('bubbleAlpha', () => {
  it('is fully opaque while fresh', () => {
    expect(bubbleAlpha(0)).toBe(1);
    expect(bubbleAlpha(8_999)).toBe(1);
  });

  it('fades linearly over the last window', () => {
    expect(bubbleAlpha(10_500)).toBeCloseTo(0.5);
  });

  it('is gone at and after the lifetime', () => {
    expect(bubbleAlpha(BUBBLE_FRESH_MS)).toBe(0);
    expect(bubbleAlpha(BUBBLE_FRESH_MS + 5_000)).toBe(0);
  });
});

describe('truncateBubbleText', () => {
  it('passes short text through', () => {
    expect(truncateBubbleText('hi there')).toBe('hi there');
  });

  it('caps long text with an ellipsis at exactly maxChars', () => {
    const out = truncateBubbleText('x'.repeat(200), 64);
    expect(out.length).toBe(64);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('debugBubbleText', () => {
  it('is deterministic and non-empty', () => {
    expect(debugBubbleText('p:1')).toBe(debugBubbleText('p:1'));
    expect(debugBubbleText('p:1').length).toBeGreaterThan(0);
  });
});
