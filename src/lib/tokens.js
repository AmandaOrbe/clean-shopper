/**
 * Design Tokens — Clean Shopper
 *
 * Single source of truth for all design values in JavaScript.
 * Mirrors tailwind.config.js exactly. Use these tokens in:
 *   - Dynamic styles that can't use Tailwind classes
 *   - Chart/data-viz libraries (Recharts, D3, etc.)
 *   - Programmatic style logic
 *   - Tests and Storybook stories
 *
 * Do NOT hardcode hex values, pixel sizes, or spacing values
 * in components — import from here instead.
 */

export const colors = {
  primary: {
    DEFAULT: '#6B8770',
    light:   '#8FAD94',
    dark:    '#4D6654',
  },
  secondary: {
    DEFAULT: '#E8DFD0',
  },
  accent: {
    DEFAULT: '#C4714F',
  },
  success: '#4A7C59',
  warning: '#C4943A',
  error:   '#B85450',
  neutral: {
    50:  '#FDFAF5',
    100: '#F5F0E8',
    200: '#E5DDD0',
    400: '#B8A898',
    600: '#6B5C4E',
    900: '#2D2420',
  },
};

export const fontFamily = {
  sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
};

export const fontSize = {
  display: { size: '48px', lineHeight: '1.1', fontWeight: '700' },
  h1:      { size: '36px', lineHeight: '1.2', fontWeight: '700' },
  h2:      { size: '28px', lineHeight: '1.3', fontWeight: '600' },
  h3:      { size: '22px', lineHeight: '1.3', fontWeight: '600' },
  h4:      { size: '18px', lineHeight: '1.4', fontWeight: '600' },
  body:    { size: '16px', lineHeight: '1.6', fontWeight: '400' },
  small:   { size: '14px', lineHeight: '1.5', fontWeight: '400' },
  micro:   { size: '12px', lineHeight: '1.4', fontWeight: '400' },
};

export const spacing = {
  'space-xs':  '4px',
  'space-sm':  '8px',
  'space-md':  '16px',
  'space-lg':  '24px',
  'space-xl':  '32px',
  'space-2xl': '48px',
  'space-3xl': '64px',
  'space-4xl': '96px',
};

export const borderRadius = {
  sm:   '6px',
  md:   '12px',
  lg:   '20px',
  full: '9999px',
};

export const boxShadow = {
  sm: '0 1px 3px rgba(45, 36, 32, 0.08)',
  md: '0 4px 12px rgba(45, 36, 32, 0.10)',
  lg: '0 8px 24px rgba(45, 36, 32, 0.13)',
};

const tokens = {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
  boxShadow,
};

export default tokens;
