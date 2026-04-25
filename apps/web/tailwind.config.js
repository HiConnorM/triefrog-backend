/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4edf96',
        'primary-dim': '#4edf96',
        'primary-container': '#00b571',
        'on-primary': '#003920',
        secondary: '#9ed2b0',
        tertiary: '#ffb3b2',
        error: '#ffb4ab',
        surface: '#0e1510',
        'surface-dim': '#0e1510',
        'surface-container-lowest': '#09100b',
        'surface-container-low': '#161d18',
        'surface-container': '#1a211c',
        'surface-container-high': '#242c26',
        'surface-container-highest': '#2f3731',
        'surface-variant': '#2f3731',
        'on-surface': '#dde5dc',
        'on-surface-variant': '#bbcabe',
        outline: '#869489',
        'outline-variant': '#3d4a40',
        background: '#0e1510',
        'on-background': '#dde5dc',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
