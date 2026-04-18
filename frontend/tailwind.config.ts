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
        cormorant: ['Cormorant Garamond', 'Georgia', 'serif'],
        cinzel: ['Cinzel', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        cream: {
          DEFAULT: '#FAF6EE',
          50: '#FAF6EE', // for backwards compatibility
        },
        parchment: {
          DEFAULT: '#F2EAD8'
        },
        gold: {
          DEFAULT: '#B8922A',
          light: '#D4A84B',
          faint: '#F5EDD5',
          500: '#C9A84C', // keep existing 
          600: '#B8923A',
        },
        green: {
          DEFAULT: '#2D5A3D',
          mid: '#3D7A54',
          light: '#EDF5F0',
        },
        ink: {
          DEFAULT: '#1C1A16',
          soft: '#3D3930',
        },
        muted: {
          DEFAULT: '#8A7E6E',
        },
        border: {
          DEFAULT: '#E4D9C4',
        },
        emerald: {
          700: '#1A6B4A', // keeping old usage to avoid crashing
        },
      },
    },
  },
  plugins: [],
} satisfies Config
