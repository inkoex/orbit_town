export type WorldTheme = 'folk' | 'space' | 'iso-slice';

export function resolveTheme(raw: string | undefined): WorldTheme {
  if (raw === 'space') return 'space';
  if (raw === 'iso-slice') return 'iso-slice';
  return 'folk';
}

export function themeFromTileSetUrl(url: string): WorldTheme {
  if (url.includes('iso-slice')) return 'iso-slice';
  if (url.includes('space-tiles')) return 'space';
  return 'folk';
}
