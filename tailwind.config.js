/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3829',
          light: '#2D5A3E',
          dark: '#0F2119',
        },
        secondary: {
          DEFAULT: '#F47820',
          dark: '#D4650F',
        },
        accent: {
          DEFAULT: '#D4F53C',
          dark: '#BADA2C',
        },
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        neutral: {
          50: '#FFFFFF',
          100: '#F5F5F0',
          200: '#E2E2DA',
          400: '#98988E',
          600: '#464640',
          900: '#121210',
        },
      },

      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        display: ['56px', { lineHeight: '1.05', fontWeight: '800' }],
        h1:      ['40px', { lineHeight: '1.15', fontWeight: '700' }],
        h2:      ['28px', { lineHeight: '1.25', fontWeight: '700' }],
        h3:      ['20px', { lineHeight: '1.35', fontWeight: '600' }],
        h4:      ['16px', { lineHeight: '1.4',  fontWeight: '600' }],
        body:    ['16px', { lineHeight: '1.6',  fontWeight: '400' }],
        small:   ['14px', { lineHeight: '1.5',  fontWeight: '400' }],
        micro:   ['12px', { lineHeight: '1.4',  fontWeight: '400' }],
      },

      spacing: {
        'space-xs':  '4px',
        'space-sm':  '8px',
        'space-md':  '16px',
        'space-lg':  '24px',
        'space-xl':  '32px',
        'space-2xl': '48px',
        'space-3xl': '64px',
        'space-4xl': '96px',
      },

      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '16px',
        full: '9999px',
      },

      boxShadow: {
        sm: '0 1px 4px rgba(0, 0, 0, 0.08)',
        md: '0 4px 16px rgba(0, 0, 0, 0.12)',
        lg: '0 12px 40px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};
