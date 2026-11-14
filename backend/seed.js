const fs = require('fs');
const { DB_PATH } = require('./config');

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CATEGORIES = [
  ['Fruits & Vegetables', '🥬'], ['Meat & Fish', '🐟'], ['Dairy & Eggs', '🥛'], ['Bakery', '🍞'],
  ['Rice, Oil & Pulses', '🌾'], ['Spices', '🌶️'], ['Snacks & Drinks', '🥤'],
];

// name, category, emoji, brand, tagline, origin, storage, shelf life, [cal, protein, carbs, fat] per 100 g, variants [label, price, compareAt], sold, featured
const PRODUCTS = [
  ['Fresh Tomato', 'Fruits & Vegetables', '🍅', 'Padma Farms', 'Firm, ripe tomatoes for curries, salads and chutneys.', 'Jashore, Bangladesh', 'Refrigerate; use within 5 days', '5 days', [18, 0.9, 3.9, 0.2], [['500 g', 40, null], ['1 kg', 75, 90]], 980, 1],
  ['Fuji Apple', 'Fruits & Vegetables', '🍎', 'Green Valley', 'Crisp and sweet, picked at peak ripeness.', 'Imported', 'Refrigerate', '14 days', [52, 0.3, 14, 0.2], [['1 kg', 280, 320], ['2 kg', 540, 640]], 760, 1],
  ['Sagar Banana', 'Fruits & Vegetables', '🍌', 'Padma Farms', 'Naturally sweet bananas, sold by the dozen.', 'Bangladesh', 'Room temperature', '4 days', [89, 1.1, 23, 0.3], [['12 pcs', 90, null]], 640, 0],
  ['Potato', 'Fruits & Vegetables', '🥔', 'Padma Farms', 'All-purpose potatoes, washed and sorted.', 'Munshiganj, Bangladesh', 'Cool, dark place', '3 weeks', [77, 2, 17, 0.1], [['1 kg', 45, null], ['5 kg', 210, 225]], 1200, 0],
  ['Himsagar Mango', 'Fruits & Vegetables', '🥭', 'Padma Farms', 'Fibre-free, fragrant mangoes from Rajshahi.', 'Rajshahi, Bangladesh', 'Room temperature', '5 days', [60, 0.8, 15, 0.4], [['2 kg', 260, 300], ['5 kg', 620, 720]], 430, 1],
  ['Rohu Fish', 'Meat & Fish', '🐟', 'Padma Farms', 'Cleaned and cut into curry pieces.', 'Mymensingh, Bangladesh', 'Keep chilled; freeze for longer', '2 days chilled', [97, 17, 0, 2.9], [['500 g', 215, null], ['1 kg', 420, 450]], 520, 1],
  ['Broiler Chicken', 'Meat & Fish', '🍗', 'Aayash Fresh', 'Skinless, cleaned and cut to your size.', 'Bangladesh', 'Keep chilled; freeze for longer', '2 days chilled', [165, 31, 0, 3.6], [['1 kg', 235, null], ['2 kg', 460, 480]], 890, 1],
  ['Beef, Bone-in', 'Meat & Fish', '🥩', 'Aayash Fresh', 'Fresh-cut beef with bone for rich curries.', 'Bangladesh', 'Keep chilled; freeze for longer', '2 days chilled', [250, 26, 0, 15], [['1 kg', 790, null]], 410, 0],
  ['Full Cream Milk', 'Dairy & Eggs', '🥛', 'Green Valley', 'Pasteurised full cream milk.', 'Bangladesh', 'Refrigerate', '5 days', [61, 3.2, 4.8, 3.3], [['500 ml', 48, null], ['1 L', 92, 98]], 1100, 1],
  ['Farm Eggs', 'Dairy & Eggs', '🥚', 'Padma Farms', 'Brown eggs from free-roaming hens.', 'Bangladesh', 'Cool, dry place', '3 weeks', [143, 13, 0.7, 9.5], [['12 pcs', 150, null], ['30 pcs', 365, 385]], 1450, 1],
  ['Plain Yogurt', 'Dairy & Eggs', '🥣', 'Green Valley', 'Set yogurt, mildly tangy and creamy.', 'Bangladesh', 'Refrigerate', '10 days', [61, 3.5, 4.7, 3.3], [['500 g', 110, null]], 350, 0],
  ['Sandwich Bread', 'Bakery', '🍞', 'Aayash Pantry', 'Soft sliced loaf, baked every morning.', 'Dhaka', 'Room temperature', '4 days', [265, 9, 49, 3.2], [['400 g', 70, null], ['800 g', 130, 140]], 700, 0],
  ['Chinigura Rice', 'Rice, Oil & Pulses', '🍚', 'Aayash Pantry', 'Aromatic short-grain rice for polao and khichuri.', 'Dinajpur, Bangladesh', 'Airtight container', '12 months', [130, 2.7, 28, 0.3], [['1 kg', 135, null], ['5 kg', 650, 690]], 930, 1],
  ['Soybean Oil', 'Rice, Oil & Pulses', '🫒', 'Aayash Pantry', 'Refined, light oil for everyday cooking.', 'Bangladesh', 'Cool, dark place', '12 months', [884, 0, 0, 100], [['1 L', 190, null], ['5 L', 920, 960]], 810, 0],
  ['Masoor Dal', 'Rice, Oil & Pulses', '🫘', 'Aayash Pantry', 'Split red lentils that cook in 15 minutes.', 'Bangladesh', 'Airtight container', '12 months', [352, 25, 63, 1.1], [['1 kg', 130, 145]], 600, 0],
  ['Turmeric Powder', 'Spices', '🌶️', 'Aayash Pantry', 'Bright, earthy and finely ground.', 'Bangladesh', 'Airtight container', '12 months', [312, 9.7, 67, 3.3], [['100 g', 55, null], ['200 g', 100, 110]], 540, 0],
  ['Mixed Nuts', 'Snacks & Drinks', '🥜', 'Green Valley', 'Roasted almonds, cashews and peanuts.', 'Imported', 'Airtight container', '6 months', [607, 20, 21, 54], [['250 g', 420, 480]], 300, 0],
  ['Orange Juice', 'Snacks & Drinks', '🧃', 'Green Valley', 'Cold-pressed, no added sugar.', 'Bangladesh', 'Refrigerate', '3 days', [45, 0.7, 10, 0.2], [['1 L', 240, 260]], 280, 0],
];

const REVIEWERS = ['Nusrat J.', 'Rafiq A.', 'Tania H.', 'Imran K.', 'Sadia R.', 'Mahin S.'];
const REVIEW_TEXT = [
  'Fresh and well packed. Arrived the same evening.',
  'Good quality for the price. Will order again.',
  'Exactly as described, and the delivery was on time.',
  'Better than what I get at the local bazaar.',
];

function seed(db) {
  const run = db.transaction(() => {
    const cat = db.prepare('INSERT INTO categories (name, slug, emoji, sort_order) VALUES (?,?,?,?)');
    const catId = {};
    CATEGORIES.forEach(([name, emoji], i) => { catId[name] = cat.run(name, slugify(name), emoji, i).lastInsertRowid; });

    const brandStmt = db.prepare('INSERT OR IGNORE INTO brands (name, slug) VALUES (?,?)');
    const getBrand = db.prepare('SELECT id FROM brands WHERE name = ?');
    const prod = db.prepare(`INSERT INTO products
      (category_id, brand_id, name, slug, short_desc, description, emoji, origin, storage, shelf_life, nutrition_json, is_featured, sold_count)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const variant = db.prepare('INSERT INTO product_variants (product_id, sku, label, price, compare_at_price, stock, is_default) VALUES (?,?,?,?,?,?,?)');
    const review = db.prepare('INSERT INTO reviews (product_id, author, rating, body) VALUES (?,?,?,?)');

    PRODUCTS.forEach((p, i) => {
      const [name, category, emoji, brand, tagline, origin, storage, shelf, n, variants, sold, featured] = p;
      brandStmt.run(brand, slugify(brand));
      const description = `${tagline} Sourced from trusted suppliers and packed the same day you order.`;
      const nutrition = JSON.stringify({ calories: n[0], protein: n[1], carbs: n[2], fat: n[3] });
      const id = prod.run(catId[category], getBrand.get(brand).id, name, slugify(name), tagline, description, emoji, origin, storage, shelf, nutrition, featured, sold).lastInsertRowid;
      variants.forEach(([label, price, cmp], j) => variant.run(id, `AEM-${id}-${j + 1}`, label, price, cmp, 50 + ((i * 7 + j * 13) % 80), j === 0 ? 1 : 0));
      for (let k = 0; k < 3; k++) review.run(id, REVIEWERS[(i + k) % REVIEWERS.length], 4 + ((i + k) % 2), REVIEW_TEXT[(i + k) % REVIEW_TEXT.length]);
    });

    db.prepare("INSERT INTO coupons (code, discount_type, value, min_order) VALUES ('AAYASH10','percent',10,500)").run();
    db.prepare("INSERT INTO coupons (code, discount_type, value, min_order) VALUES ('WELCOME50','fixed',50,400)").run();
  });
  run();
}

module.exports = { seed };

if (require.main === module) {
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + ext, { force: true });
  const db = require('./db');
  seed(db);
  console.log('Database seeded:', DB_PATH);
}
