/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

export default {
  darkMode: 'class',
  content: [
    './content/**/*.md',
    './layouts/**/*.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@nongbitcorp/tailwind-room-between'),
  ],
}

