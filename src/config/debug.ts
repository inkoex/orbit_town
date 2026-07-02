// Vite-only. Do NOT import this from Jest-tested modules.
import { parseViewMode } from './viewMode';

export const ISO_DEBUG = import.meta.env.VITE_ISO_DEBUG === 'true';
export const VIEW_MODE = parseViewMode(import.meta.env.VITE_VIEW_MODE);

// When true, agents are forced into deterministic active/idle states (by id hash)
// so the active-vs-idle styling is visible and reproducible for verification.
// Live Convex data is non-deterministic and may show everyone idle at a glance;
// this does NOT fabricate backend agents, it only overrides the visual state.
export const ISO_STATE_DEBUG = import.meta.env.VITE_ISO_STATE_DEBUG === 'true';

// When true, every agent shows a deterministic fake speech bubble (by id hash)
// so bubble layout/wrapping is verifiable while the world is Frozen (no live
// messages). Visual-only; no backend data is fabricated.
export const ISO_BUBBLE_DEBUG = import.meta.env.VITE_ISO_BUBBLE_DEBUG === 'true';
