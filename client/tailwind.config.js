/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    { pattern: /bg-(.*)-100/ },
    { pattern: /bg-(.*)-900/, variants: ['dark'] },
    { pattern: /border-(.*)-300/ },
    { pattern: /border-(.*)-600/, variants: ['dark'] },
    { pattern: /text-(.*)-500/ },
    { pattern: /text-(.*)-400/, variants: ['dark'] },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}