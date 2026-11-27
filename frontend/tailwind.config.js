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
        ink: '#2B2420',                 // body text (warm near-black)
        brown: '#5E2409',               // logo bag brown: hero panel, offer band, headings
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)', // brand orange (#FF9933), overridable from Admin → Website → Theme
          hover: 'rgb(var(--c-primary-hover) / <alpha-value>)',
          deep: 'rgb(var(--c-primary-deep) / <alpha-value>)',              // darker orange for TEXT on light backgrounds (FF9933 is too light to read)
          soft: 'rgb(var(--c-primary-soft) / <alpha-value>)',              // light orange for charts
        },
        taupe: {                        // admin neutrals (slate): white, black and blue admin theme
          DEFAULT: '#94A3B8',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        accent: 'rgb(var(--c-accent) / <alpha-value>)', // Hot tag and discount badges (Admin → Theme → Accent)
        footer: 'rgb(var(--c-footer) / <alpha-value>)', // storefront footer background
        canvas: '#FFFFFF',              // page background
        tint: {                         // soft cream/peach surfaces (also used for product tiles)
          DEFAULT: '#FAF5EF',
          2: '#FDE9D6',
          3: '#F8EBDD',
          4: '#FFF5E3',
          5: '#FBE5D0',
        },
        line: '#EAE3DB',                // thin warm-grey borders
        muted: '#7A726A',               // secondary text
        peach: '#F3D9C2',               // light text on brown
        sand: '#E9D2BE',                // light text on ink (footer)
        wash: '#F4F6F9',                // admin page background
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
      boxShadow: {
        card: '0 1px 2px rgba(43,40,35,.06), 0 1px 3px rgba(43,40,35,.05)',
        pop: '0 12px 32px rgba(43,40,35,.18)',
      },
    },
  },
  plugins: [],
};
