/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5', // Indigo from design spec
          hover: '#4338CA',
          light: '#EEF2FF',
        },
        background: {
          light: '#F8FAFC',
          dark: '#020617',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#0F172A',
        },
        sidebar: {
          light: '#FFFFFF',
          dark: '#111827',
        },
        border: {
          light: '#E2E8F0',
          dark: '#1E293B',
        }
      },
    },
  },
  plugins: [],
};
