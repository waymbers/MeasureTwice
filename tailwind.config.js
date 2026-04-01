/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        blueprint: {
          50:  '#e8f0fe',
          100: '#c5d8fc',
          200: '#9bbef9',
          300: '#6fa3f6',
          400: '#4a8bf2',
          500: '#2563eb',
          600: '#1a4fc4',
          700: '#0f3a9c',
          800: '#0a2875',
          900: '#051a52',
          950: '#03112e',
        },
      },
    },
  },
  plugins: [],
}

