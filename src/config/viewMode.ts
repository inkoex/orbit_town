export type ViewMode = 'topdown' | 'iso';

// Pure parser, safe to import from Jest-tested modules. The Vite-only
// VIEW_MODE constant (which reads import.meta.env) lives in debug.ts to keep
// import.meta out of the Jest module graph.
export function parseViewMode(raw: string | undefined): ViewMode {
  return raw === 'iso' ? 'iso' : 'topdown';
}
