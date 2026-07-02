// Pure, Vite-free (Jest-safe) speech-bubble logic: which message to show, how
// long it stays, how it fades. Rendering lives in SpeechBubble.tsx; keeping the
// selection/fade math here mirrors activeState.ts so it stays unit-testable.

export interface BubbleMessage {
  author: string;
  text: string;
  messageUuid: string;
  _creationTime: number;
}

// A bubble lives 12s total and fades over its last 3s. Short enough that stale
// chatter doesn't linger over a moved-on agent, long enough to read two lines.
export const BUBBLE_FRESH_MS = 12_000;
export const BUBBLE_FADE_MS = 3_000;

// listMessages returns messages in ascending _creationTime order; the newest
// message THIS player authored is the one their bubble shows (the other
// participant renders their own bubble from the same subscription).
export function pickLatestAuthoredMessage(
  messages: BubbleMessage[],
  playerId: string,
): BubbleMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].author === playerId) return messages[i];
  }
  return undefined;
}

// 1.0 while fresh, linear fade over the last BUBBLE_FADE_MS, 0 after.
export function bubbleAlpha(ageMs: number): number {
  if (ageMs >= BUBBLE_FRESH_MS) return 0;
  const fadeStart = BUBBLE_FRESH_MS - BUBBLE_FADE_MS;
  if (ageMs <= fadeStart) return 1;
  return (BUBBLE_FRESH_MS - ageMs) / BUBBLE_FADE_MS;
}

// Cap the bubble to ~2 wrapped lines; PIXI wordWrap handles line breaks, the
// char cap bounds the panel height.
export function truncateBubbleText(text: string, maxChars = 64): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + '…';
}

// Deterministic fake line per player for VITE_ISO_BUBBLE_DEBUG — same id-hash
// trick as debugActiveState, so bubbles are verifiable while the world is
// Frozen (no live messages). Includes a Korean line to verify KR wrapping.
const DEBUG_LINES = [
  'Totally, I will swing by the project booth after the keynote.',
  '좌표 확인 완료. 다음 구역으로 이동합니다.',
  'That sounds like a massive strain on local compute, but fascinating.',
  'Sounds good, I will probably see you there later then.',
];

export function debugBubbleText(playerId: string): string {
  const h = Math.abs([...playerId].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
  return DEBUG_LINES[h % DEBUG_LINES.length];
}
