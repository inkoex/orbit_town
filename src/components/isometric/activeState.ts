// Pure, Vite-free (Jest-safe): do NOT import config/debug or anything using
// import.meta here. The active/idle distinction is the legibility payload baked
// into the iso look. "active" means the agent shows a real busy signal right now;
// "idle" means none. (Named active/idle, not work/idle: the backend activity is
// ambient flavor — reading/daydreaming — not instrumented work.)
export type ActiveState = 'active' | 'idle';

export interface ActivitySignals {
  isSpeaking: boolean;
  isThinking: boolean;
  isMoving: boolean;
  hasLiveActivity: boolean;
}

export function deriveActiveState(s: ActivitySignals): ActiveState {
  return s.isSpeaking || s.isThinking || s.isMoving || s.hasLiveActivity ? 'active' : 'idle';
}

// Deterministic per-id state for VITE_ISO_STATE_DEBUG. Live Convex data is
// non-deterministic and may show everyone idle at a glance; this forces a stable
// active/idle split (by id hash) so the contrast is visible and reproducible for
// verification screenshots. It does not fabricate agents.
export function debugActiveState(playerId: string): ActiveState {
  const h = Math.abs([...playerId].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
  return h % 2 === 0 ? 'active' : 'idle';
}
