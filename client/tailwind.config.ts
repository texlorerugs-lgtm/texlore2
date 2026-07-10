import type { Config } from 'tailwindcss';

/**
 * Texlore luxury palette — brand-new, not reused.
 *   midnight   — deep navy (primary)
 *   emerald    — royal green (secondary)
 *   gold       — luxury gold (accent)
 *   ivory      — warm ivory (background)
 *   pearl      — pearl white (cards)
 *   charcoal   — text
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          50: '#EEF1F8',
          100: '#D6DDEC',
          200: '#AEBBD9',
          300: '#8698C7',
          400: '#5D74B4',
          500: '#3D5698',
          600: '#2B4079',
          700: '#1D2E5B',
          800: '#12204A',
          900: '#0B1B3A',
          950: '#050E23',
        },
        emerald: {
          500: '#1F7A4D',
          600: '#186139',
          700: '#134E2E',
          800: '#0F3F26',
          900: '#0A2E1B',
        },
        gold: {
          300: '#EBD08A',
          400: '#DEC072',
          500: '#D4AF37',
          600: '#B8952B',
          700: '#957622',
        },
        ivory: '#FBF7F0',
        pearl: '#FFFFFF',
        charcoal: {
          400: '#4A4A55',
          500: '#2F2F38',
          600: '#1F1F26',
          700: '#141419',
        },
        line: '#E7E1D3',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
        pill: '999px',
      },
      boxShadow: {
        luxury: '0 20px 60px -20px rgba(11, 27, 58, 0.25)',
        card: '0 8px 30px -12px rgba(11, 27, 58, 0.18)',
        soft: '0 2px 12px rgba(11, 27, 58, 0.08)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #EBD08A 50%, #D4AF37 100%)',
        'midnight-gradient': 'linear-gradient(135deg, #0B1B3A 0%, #1D2E5B 100%)',
      },
      transitionTimingFunction: {
        'out-luxury': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-800px 0' },
          '100%': { backgroundPosition: '800px 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
