# Aayash E-Mart

Food e-commerce starter: **Next.js** storefront + separate **Express** API + **SQLite** database.

```
aayash-emart/
├── backend/    Express API on port 4000 (SQLite, schema.sql, seed.js)
└── frontend/   Next.js 14 (App Router) on port 3000
```

## Run it (Node 18.18+)

```bash
# Terminal 1 - API (creates and seeds the database on first start)
cd backend
npm install
npm start            # http://localhost:4000

# Terminal 2 - storefront
cd frontend
cp .env.local.example .env.local
npm install
npm run dev          # http://localhost:3000
```

Reset sample data any time with `npm run seed` in `backend/`.

## Database tables (backend/schema.sql)
categories, brands, products, product_variants (pack sizes, price, stock), product_images,
customers, addresses, coupons, orders, order_items, reviews, wishlists, newsletter_subscribers.

## API
- GET  /api/categories
- GET  /api/products?category=&q=&sort=popular|price_asc|price_desc|newest&deal=1&limit=
- GET  /api/products/:slug  (variants, images, reviews, nutrition, related)
- POST /api/orders  (prices, stock and coupons are re-checked on the server)
- POST /api/newsletter  { email }

Sample coupons: AAYASH10 (10%, min 500), WELCOME50 (50 off, min 400).

## Notes
- Styling is **Tailwind CSS**. The theme (colors from the logo, fonts, radii, container width) lives in `frontend/tailwind.config.js`; change it there and the whole site updates. Use theme names (`bg-primary`, `text-muted`, `bg-brown`) rather than hex values.
- Reusable building blocks are in `frontend/components/ui/` (Button, Container, Section, Pill, Badge, Stepper, Field, ProductGrid). `globals.css` only holds the Tailwind directives and a few base rules.
- Currency is BDT. Delivery 60, free over 1,000 (backend/config.js and frontend/lib/format.js).
- Products have no photos yet, so tiles show emoji. Set products.image_url or add rows to product_images and photos appear automatically.
- Footer contact details are placeholders. Cart lives in the browser; login, admin and online payment are not included yet.
