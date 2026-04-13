import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        scheherazade: ['Scheherazade New', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        gold: {
          500: '#C9A84C',
          600: '#B8923A',
        },
        emerald: {
          700: '#1A6B4A',
        },
        cream: {
          50: '#FDFAF2',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
