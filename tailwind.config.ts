import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FBF6EF',
        paper: '#FFFFFF',
        ink: '#1B1714',
        muted: '#7A6E64',
        line: '#EAE0D5',
        accent: '#E0553B',
        'accent-soft': '#FBE7E1',
        sage: '#4F6F52',
        'sage-soft': '#E6EEE5',
        gold: '#C8922A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,23,20,0.04), 0 8px 24px -12px rgba(27,23,20,0.14)',
        sheet: '0 -12px 40px -12px rgba(27,23,20,0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
