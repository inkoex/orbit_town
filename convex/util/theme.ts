export type WorldTheme = 'folk' | 'space';

export function resolveTheme(raw: string | undefined): WorldTheme {
  return raw === 'space' ? 'space' : 'folk';
}

export function themeFromTileSetUrl(url: string): WorldTheme {
  return url.includes('space-tiles') ? 'space' : 'folk';
}
