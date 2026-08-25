/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1A1A',
        steel: '#3D4451',
        accent: '#2B5F8C',
        fill: '#B02A1F',
        muted: '#6B7280',
        rule: '#9AA0A6',
      },
    },
  },
  plugins: [],
};
