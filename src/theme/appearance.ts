export const colorThemes = [
  'essential',
  'mint',
  'linen',
  'harbor',
  'berry',
] as const;
export type ColorTheme = (typeof colorThemes)[number];
export const themeLabels: Record<ColorTheme, string> = {
  essential: 'Default',
  mint: 'Mint',
  linen: 'Linen',
  harbor: 'Harbor',
  berry: 'Berry',
};
export function normalizeColorTheme(value: unknown): ColorTheme {
  return colorThemes.includes(value as ColorTheme)
    ? (value as ColorTheme)
    : 'mint';
}
