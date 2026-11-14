/**
 * Aayash E-Mart theme — the single source of truth for colors, fonts, radii and layout width.
 * Colors are taken from the logo. Change them here and the whole site updates.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#3A1707',                 // body text, dark surfaces (logo wordmark brown)
        brown: '#5E2409',               // logo bag brown: hero panel, offer band, headings
        primary: {
          DEFAULT: '#F47B07',           // logo orange: buttons, accents
          hover: '#FF8E26',
          deep: '#B84D00',              // orange for text on light backgrounds (readable)
        },
        canvas: '#FFFCF8',              // page background
        tint: {                         // soft cream/peach surfaces (also used for product tiles)
          DEFAULT: '#FFF4E6',
          2: '#FDE9D6',
          3: '#F8EBDD',
          4: '#FFF5E3',
          5: '#FBE5D0',
        },
        line: '#EFE4D6',                // borders
        muted: '#7B6A5B',               // secondary text
        peach: '#F3D9C2',               // light text on brown
        sand: '#E9D2BE',                // light text on ink (footer)
        success: '#1F7A3E',
        danger: '#B42318',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'DM Sans', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { container: '1200px' },
      borderRadius: { card: '18px', panel: '28px' },
    },
  },
  plugins: [],
};
