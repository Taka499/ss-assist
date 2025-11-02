/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'ja': ['Noto Sans JP', 'sans-serif'],
        'zh-hans': ['Noto Sans SC', 'sans-serif'],
        'zh-hant': ['Noto Sans TC', 'sans-serif'],
      },
      colors: {
        // Custom color palette for game theme
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        rarity: {
          5: '#fbbf24', // gold
          4: '#a78bfa', // purple
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
