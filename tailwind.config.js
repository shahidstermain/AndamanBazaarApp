/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.tsx",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./packages/planner-ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary: Deep Teal — the color of Andaman waters
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0d9e8a', // Andaman teal
          600: '#0d6e8e', // Deep Teal — PRIMARY
          700: '#0e5a74',
          800: '#134e62',
          900: '#144356',
          950: '#092a38',
        },
        // Secondary: Coral — island sunsets
        coral: {
          50: '#fff4f2',
          100: '#ffe5df',
          200: '#ffcfc5',
          300: '#ffad9e',
          400: '#ff8a76',
          500: '#ff6b4a', // Coral — SECONDARY
          600: '#f04830',
          700: '#cb3420',
          800: '#a82b1c',
          900: '#8c281d',
        },
        // Accent: Sandy Gold — warm island sand
        sandy: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f5c842', // Sandy Gold — ACCENT
          500: '#eaaa15',
          600: '#c98a0e',
          700: '#a36a10',
          800: '#855415',
          900: '#6f4514',
        },
        // Surface: Warm White
        warm: {
          50: '#fafaf7',
          100: '#f5f5f0',
          200: '#ecece4',
          300: '#d9d9cd',
          400: '#b8b8a9',
          950: '#e8e8e0',
        },
        // Dark: Deep Midnight Blue
        midnight: {
          500: '#162236',
          600: '#0e1928',
          700: '#0b1a2e', // Deep Midnight — dark text/bg
          800: '#070f1a',
          900: '#040b13',
        },
        // Legacy ocean (keep for backward compat)
        ocean: {
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
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Instrument Sans', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Outfit', 'sans-serif'],
        display: ['DM Serif Display', 'Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'teal-glow': '0 8px 32px rgba(13, 110, 142, 0.25)',
        'coral-glow': '0 8px 32px rgba(255, 107, 74, 0.25)',
        'sandy-glow': '0 8px 32px rgba(245, 200, 66, 0.25)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 40px rgba(13, 110, 142, 0.15)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      backgroundImage: {
        'teal-gradient': 'linear-gradient(135deg, #0d9e8a 0%, #0d6e8e 100%)',
        'coral-gradient': 'linear-gradient(135deg, #ff8a76 0%, #ff6b4a 100%)',
        'sandy-gradient': 'linear-gradient(135deg, #fcd34d 0%, #f5c842 100%)',
        'midnight-gradient': 'linear-gradient(180deg, #0b1a2e 0%, #162236 100%)',
        'island-hero': 'linear-gradient(135deg, #0d6e8e 0%, #0d9e8a 50%, #14b8a6 100%)',
        // Category gradients
        'cat-fish': 'linear-gradient(135deg, #0d6e8e, #0d9e8a)',
        'cat-produce': 'linear-gradient(135deg, #16a34a, #4ade80)',
        'cat-crafts': 'linear-gradient(135deg, #9333ea, #c084fc)',
        'cat-experience': 'linear-gradient(135deg, #0284c7, #38bdf8)',
        'cat-rentals': 'linear-gradient(135deg, #ca8a04, #fde68a)',
        'cat-services': 'linear-gradient(135deg, #dc2626, #f87171)',
        'cat-general': 'linear-gradient(135deg, #475569, #94a3b8)',
        'cat-tourism': 'linear-gradient(135deg, #ff6b4a, #fcd34d)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-heart': 'pulseHeart 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite linear',
        'wave': 'wave 2.5s ease-in-out infinite',
        'carousel': 'carousel 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pulseHeart: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.7)' },
        },
        carousel: {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%': { transform: 'translate(2px, -4px) rotate(0.5deg)' },
          '66%': { transform: 'translate(-2px, 2px) rotate(-0.5deg)' },
        },
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(32px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ocean-swell': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
  },
};