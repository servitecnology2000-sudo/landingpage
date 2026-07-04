/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#000000',
        'brand-cyan': '#00CFFF',
        'brand-green': '#00FF7F',
      },
    },
  },
  plugins: [],
}
