// Prints the SQL that loads the spaceship catalog from src/lib/ship.ts.
// Usage: node scripts/gen-shop-sql.mjs
// Paste the output into the "catalog" section of supabase/003_spaceship.sql when prices change.
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/ship.ts', import.meta.url), 'utf8');
const re = /\{ id: '([^']+)', slot: '([^']+)', name: '([^']+)', price: (\d+) \}/g;
const rows = [...src.matchAll(re)].map(([, id, slot, name, price]) => `  ('${id}', '${slot}', '${name.replace(/'/g, "''")}', ${price})`);
if (!rows.length) throw new Error('No items found');
console.log(`insert into public.shop_items (id, slot, name, price) values
${rows.join(',\n')}
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price;`);
