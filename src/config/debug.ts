// Vite-only. Do NOT import this from Jest-tested modules.
import { parseViewMode } from './viewMode';

export const ISO_DEBUG = import.meta.env.VITE_ISO_DEBUG === 'true';
export const VIEW_MODE = parseViewMode(import.meta.env.VITE_VIEW_MODE);
