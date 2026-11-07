export const palettes = {
  light: {
    background: '#F7FAF8',
    surface: '#FFFFFF',
    primary: '#168B78',
    pressed: '#116D5D',
    text: '#193C33',
    secondary: '#62786D',
    soft: '#E8F3EC',
    border: '#E0EAE3',
    warm: '#F3D28A',
    danger: '#B64242',
    onPrimary: '#FFFFFF',
  },
  dark: {
    background: '#111C1B',
    surface: '#1D2A28',
    primary: '#5CD6AD',
    pressed: '#3CB28F',
    text: '#F2F8F4',
    secondary: '#A3B7AD',
    soft: '#273F36',
    border: '#334740',
    warm: '#806A39',
    danger: '#FF9999',
    onPrimary: '#111C1B',
  },
};
export type Palette = typeof palettes.light;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 12, md: 20, lg: 28 };
