/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: 'oklch(0.35 0.06 280 / 55%)',
        input: 'oklch(0.35 0.06 280 / 55%)',
        ring: 'oklch(0.72 0.16 355)',
        background: 'oklch(0.17 0.055 265)',
        foreground: 'oklch(0.96 0.012 300)',
        primary: {
          DEFAULT: 'oklch(0.72 0.16 355)',
          foreground: 'oklch(0.16 0.05 265)',
        },
        secondary: {
          DEFAULT: 'oklch(0.27 0.07 266)',
          foreground: 'oklch(0.95 0.012 300)',
        },
        destructive: {
          DEFAULT: 'oklch(0.6 0.22 22)',
          foreground: 'oklch(0.98 0.003 247)',
        },
        muted: {
          DEFAULT: 'oklch(0.26 0.06 266)',
          foreground: 'oklch(0.74 0.035 300)',
        },
        accent: {
          DEFAULT: 'oklch(0.8 0.12 350)',
          foreground: 'oklch(0.16 0.05 265)',
        },
        popover: {
          DEFAULT: 'oklch(0.22 0.06 266)',
          foreground: 'oklch(0.96 0.012 300)',
        },
        card: {
          DEFAULT: 'oklch(0.22 0.06 266)',
          foreground: 'oklch(0.96 0.012 300)',
        },
      },
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'metal-shift': 'metal-shift 8s ease-in-out infinite alternate',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'sheen': 'sheen 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'metal-shift': {
          'from': { backgroundPosition: '0% 50%' },
          'to': { backgroundPosition: '100% 50%' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'sheen': {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(220%) skewX(-18deg)' },
        },
      },
    },
  },
  plugins: [],
}
