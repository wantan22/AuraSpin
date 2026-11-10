/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chalk: '#F9F9FB',
        milk: { 50: '#FBF7F2', 100: '#F3EADF', 200: '#E8DACA', 300: '#D9C4AC', 400: '#C4A788', 500: '#A9896A' },
        charcoal: '#1E1E24',
        obsidian: '#121214',
        gravel: { DEFAULT: '#1A1A1E', 2: '#232328', 3: '#2C2C32' },
        warm: '#E4E4E7',
      },
      fontFamily: {
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 50px -20px rgba(0,0,0,0.35)',
      },
      keyframes: {
        spin: { to: { transform: 'rotate(360deg)' } },
        drift: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(4%, -3%) scale(1.08)' },
        },
        pulsering: {
          '0%,100%': { boxShadow: '0 0 0 2px rgba(255,214,170,0.9), 0 0 24px 6px rgba(255,190,130,0.55)' },
          '50%': { boxShadow: '0 0 0 3px rgba(255,214,170,1), 0 0 44px 14px rgba(255,190,130,0.75)' },
        },
        rise: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'spin-record': 'spin 1.8s linear infinite',
        drift: 'drift 18s ease-in-out infinite',
        pulsering: 'pulsering 2.2s ease-in-out infinite',
        rise: 'rise .35s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
