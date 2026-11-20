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
          DEFAULT: '#FF9933',           // brand orange: buttons, active states, accents
          hover: '#FFA64D',
          deep: '#A85500',              // darker orange for TEXT on light backgrounds (FF9933 is too light to read)
          soft: '#FFC78A',              // light orange for charts
        },
        taupe: {                        // brand neutral (8C857A) and its tints/shades: admin surfaces, text, borders
          DEFAULT: '#8C857A',
          50: '#F7F5F2',
          100: '#EEEBE6',
          200: '#DDD9D2',
          300: '#C4BFB6',
          600: '#6B655B',
          700: '#57524A',
          800: '#3F3B35',
          900: '#2B2823',
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
        wash: '#F6F4F0',                // admin page background
        success: '#1F7A3E',
        danger: '#B42318',
      },
      fontFamily: {
        // Roboto everywhere. Roboto ships 400/500/700 here, so headings use font-bold (no 800).
        display: ['Roboto', 'system-ui', 'sans-serif'],
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        serif: ['Roboto', 'system-ui', 'sans-serif'], // storefront headings use font-serif; remove this line to get a real serif back
      },
      maxWidth: { container: '1200px' },
      borderRadius: { card: '18px', panel: '28px' },
    },
  },
  plugins: [],
};
