/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#1A1C2E',
        'ink-soft': '#3A3F5C',
        muted: '#7A82A1',
        line: '#EDE7DA',
        cream: '#FAF6EF',
        'cream-deep': '#F3ECDF',
        paper: '#FFFFFF',
        blue: '#4C7BFF',
        'blue-deep': '#2A4AD9',
        'blue-soft': '#DEE8FF',
        pink: '#F25BB0',
        'pink-soft': '#FFDAEE',
        purple: '#8B5BD8',
        sage: '#A8C4A2',
        'sage-soft': '#E3EDDF',
        peach: '#F6C6A8',
        'peach-soft': '#FDE6D4',
        lavender: '#C9B8E8',
      },
      fontFamily: {
        fraunces: ['Fraunces_400Regular'],
        'fraunces-italic': ['Fraunces_300Light_Italic'],
        'fraunces-medium': ['Fraunces_500Medium'],
        'dm-sans': ['DMSans_400Regular'],
        'dm-sans-medium': ['DMSans_500Medium'],
        'dm-sans-bold': ['DMSans_700Bold'],
        'instrument-serif': ['InstrumentSerif_400Regular_Italic'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
