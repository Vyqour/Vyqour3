import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0B',
        foreground: '#FFFFFF',
        card: {
          DEFAULT: 'rgba(24,24,27,0.72)',
          solid: '#121212',
        },
        border: 'rgba(255,255,255,0.08)',
        muted: {
          DEFAULT: '#171717',
          foreground: '#A1A1AA',
        },
        primary: {
          DEFAULT: '#5B21B6',
          foreground: '#FFFFFF',
          glow: '#7C3AED',
        },
        secondary: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#5B21B6',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        success: '#16A34A',
        ring: '#5B21B6',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.45)',
        glow: '0 0 40px rgba(91,33,182,0.35)',
        'glow-sm': '0 0 20px rgba(91,33,182,0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(91,33,182,0.35), transparent)',
        'card-shine':
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(91,33,182,0.08) 100%)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        shimmer: 'shimmer 1.5s infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
