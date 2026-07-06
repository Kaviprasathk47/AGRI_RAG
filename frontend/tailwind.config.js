/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables dark mode toggling via class name
  theme: {
    extend: {
      colors: {
        // Premium agricultural green color palette for chemical and farming context
        pesticide: {
          50: '#f4fbf7',
          100: '#e6f7ec',
          200: '#cbf0d8',
          300: '#a0e2b8',
          400: '#6ccf8f',
          500: '#43b56c',
          550: '#369a58',
          600: '#2e854b', // Primary brand green
          650: '#26703e',
          700: '#1f5b32',
          800: '#184727',
          900: '#12331c',
          950: '#091c0f',
        },
        // Custom intermediate shades to fix text contrast & border visibility
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          150: '#ebf1f5',
          200: '#e2e8f0',
          205: '#dae2eb',
          250: '#cbd5e1',
          300: '#cbd5e1',
          350: '#94a3b8',
          400: '#94a3b8',
          450: '#64748b',
          500: '#64748b',
          600: '#475569',
          650: '#3c4858',
          700: '#334155',
          750: '#273242',
          800: '#1e293b',
          850: '#161f2c',
          900: '#0f172a',
          950: '#090d16',
        },
        emerald: {
          250: '#a7f3d0',
          450: '#34d399',
        },
        rose: {
          250: '#fecdd3',
          450: '#fb7185',
          550: '#e11d48',
        },
        amber: {
          450: '#fbbf24',
        },
        teal: {
          650: '#0d9488',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
