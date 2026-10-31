#!/usr/bin/env node
/**
 * Creates five connected test users for local testing.
 *
 *   1. Creates (or reuses) five Clerk users with `+clerk_test` emails. In a
 *      Clerk development instance these sign in with the code 424242 — no
 *      real inbox needed.
 *   2. Writes supabase/seed.generated.sql: a list per user, items, and gifts
 *      the friends have claimed on each other's lists. Run that file in the
 *      Supabase SQL editor (it bypasses RLS there). Re-running it replaces
 *      the previous seed data; lists whose share id ends in `-seed` are
 *      treated as seed data.
 *
 * Usage: npm run seed
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function loadEnv() {
  const env = {}
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}

const secretKey = loadEnv().CLERK_SECRET_KEY
if (!secretKey?.startsWith('sk_test_')) {
  console.error('Refusing to run: CLERK_SECRET_KEY must be a development (sk_test_) key.')
  process.exit(1)
}

async function clerk(method, endpoint, body) {
  const response = await fetch(`https://api.clerk.com/v1${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json()
  if (!response.ok) {
    throw new Error(`Clerk ${method} ${endpoint} failed: ${JSON.stringify(json.errors ?? json)}`)
  }
  return json
}

const IMAGES = {
  headphones:
    'https://cdn.magicpatterns.com/patterns/generated-images/0a8e3950-8dcf-40d1-afb9-7c4c5dc37b8c.jpg',
  mug: 'https://cdn.magicpatterns.com/patterns/generated-images/5d7c83a8-4519-4326-8c48-b4293e137eb5.jpg',
  shoes:
    'https://cdn.magicpatterns.com/patterns/generated-images/4f3c0583-cccd-47cd-9a06-4ea9081f4d10.jpg',
  book: 'https://cdn.magicpatterns.com/patterns/generated-images/2e6645e0-2b19-4e05-a062-cd271270b0b5.jpg',
  camera:
    'https://cdn.magicpatterns.com/patterns/generated-images/50074596-87a7-4b48-a326-b1489ca462ec.jpg',
}

/**
 * The friend group. `claimedBy` is the first name of the friend who
 * claimed the item — that's how the users are connected.
 */
const PEOPLE = [
  {
    key: 'maya',
    first: 'Maya',
    last: 'Ellis',
    lists: [
      {
        title: '30th Birthday',
        cover: 'birthday',
        occasion: 'Birthday',
        eventDate: '2026-11-21',
        note: 'Turning 30! Anything cozy or kitchen-y makes me happy.',
        items: [
          ['Studio Wireless Noise-Cancelling Headphones', 'headphones', 'Best Buy', 279, 'must', 'Jordan', 'For the commute — black please'],
          ['Speckled Stoneware Mug Set (2)', 'mug', 'Etsy', 48, 'normal', 'Priya'],
          ['Slow Sundays: A Cookbook for Long Mornings', 'book', 'Bookshop', 35, 'normal'],
          ['Instant Film Camera — Silver', 'camera', 'Target', 119, 'low'],
          ['Everyday Runner — Sage / Bone', 'shoes', 'Allbirds', 132, 'must', null, 'Size 8'],
        ],
      },
    ],
  },
  {
    key: 'jordan',
    first: 'Jordan',
    last: 'Reyes',
    lists: [
      {
        title: 'Wedding Registry',
        cover: 'wedding',
        occasion: 'Wedding',
        eventDate: '2027-05-15',
        note: 'Sam and I are so grateful. Being there is the real gift!',
        items: [
          ['Speckled Stoneware Mug Set (2)', 'mug', 'Etsy', 48, 'normal', 'Maya'],
          ['Slow Sundays: A Cookbook for Long Mornings', 'book', 'Bookshop', 35, 'low', 'Theo'],
          ['Instant Film Camera — Silver', 'camera', 'Target', 119, 'must', 'Priya', 'For the photo booth'],
          ['Studio Wireless Noise-Cancelling Headphones', 'headphones', 'Best Buy', 279, 'normal'],
        ],
      },
    ],
  },
  {
    key: 'priya',
    first: 'Priya',
    last: 'Shah',
    lists: [
      {
        title: 'New Apartment',
        cover: 'home',
        occasion: 'New home',
        eventDate: null,
        note: 'Finally have a kitchen big enough to cook in.',
        items: [
          ['Speckled Stoneware Mug Set (2)', 'mug', 'Etsy', 48, 'must', 'Ben'],
          ['Slow Sundays: A Cookbook for Long Mornings', 'book', 'Bookshop', 35, 'normal'],
          ['Instant Film Camera — Silver', 'camera', 'Target', 0, 'low', null, 'Any instant camera works'],
          ['Everyday Runner — Sage / Bone', 'shoes', 'Allbirds', 132, 'normal'],
        ],
      },
    ],
  },
  {
    key: 'theo',
    first: 'Theo',
    last: 'Park',
    lists: [
      {
        // Every item is claimed, to show the "Everything's covered" state.
        title: 'Baby Shower',
        cover: 'baby',
        occasion: 'Baby',
        eventDate: '2026-12-06',
        note: null,
        items: [
          ['Slow Sundays: A Cookbook for Long Mornings', 'book', 'Bookshop', 35, 'normal', 'Maya', 'Meals we can make one-handed'],
          ['Studio Wireless Noise-Cancelling Headphones', 'headphones', 'Best Buy', 279, 'must', 'Jordan', 'For naps. Ours, not the baby’s'],
          ['Speckled Stoneware Mug Set (2)', 'mug', 'Etsy', 48, 'low', 'Priya'],
        ],
      },
    ],
  },
  {
    key: 'ben',
    first: 'Ben',
    last: 'Okafor',
    lists: [
      {
        // Nothing claimed yet, so it's ready for testing the claim flow.
        title: 'Holiday Wishlist',
        cover: 'holiday',
        occasion: 'Holidays',
        eventDate: '2026-12-25',
        note: 'No pressure — just ideas!',
        items: [
          ['Everyday Runner — Sage / Bone', 'shoes', 'Allbirds', 132, 'must', null, 'Size 11'],
          ['Instant Film Camera — Silver', 'camera', 'Target', 119, 'normal'],
          ['Slow Sundays: A Cookbook for Long Mornings', 'book', 'Bookshop', 35, 'low'],
        ],
      },
      {
        // Empty list, to show the owner's empty state.
        title: 'Just Because',
        cover: 'just-because',
        occasion: 'Just because',
        eventDate: null,
        note: null,
        items: [],
      },
    ],
  },
]

async function ensureUser(person) {
  const email = `${person.key}+clerk_test@example.com`
  const existing = await clerk('GET', `/users?email_address=${encodeURIComponent(email)}`)
  if (existing.length > 0) return { ...person, email, id: existing[0].id, created: false }
  const user = await clerk('POST', '/users', {
    email_address: [email],
    username: `${person.key}_test`,
    first_name: person.first,
    last_name: person.last,
    skip_password_requirement: true,
  })
  return { ...person, email, id: user.id, created: true }
}

const shareIdFor = (user, list) =>
  `${user.key}-${list.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-seed`

const sql = (value) =>
  value === null || value === undefined ? 'null' : `'${String(value).replace(/'/g, "''")}'`

function buildSeedSql(users) {
  const lines = [
    '-- Generated by scripts/seed-test-users.mjs. Run in the Supabase SQL editor.',
    '-- Replaces any previous seed data (lists whose share id ends in -seed).',
    'begin;',
    "delete from public.wishlists where share_id like '%-seed';",
  ]
  for (const user of users) {
    const fullName = `${user.first} ${user.last}`
    for (const list of user.lists) {
      const shareId = shareIdFor(user, list)
      lines.push(
        '',
        `-- ${fullName}: ${list.title}`,
        `insert into public.wishlists (owner_id, owner_name, title, occasion, event_date, note, cover, share_id)`,
        `values (${sql(user.id)}, ${sql(fullName)}, ${sql(list.title)}, ${sql(list.occasion)}, ${sql(list.eventDate)}, ${sql(list.note)}, ${sql(list.cover)}, ${sql(shareId)});`,
      )
      list.items.forEach(([title, image, retailer, price, priority, claimedBy, note], index) => {
        // Stagger added_at so items keep a stable order.
        const insertItem = [
          `insert into public.wishlist_items (wishlist_id, title, url, retailer, image, price, note, priority, added_at)`,
          `select id, ${sql(title)}, ${sql(`https://example.com/${image}`)}, ${sql(retailer)}, ${sql(IMAGES[image])}, ${price}, ${sql(note)}, ${sql(priority)}, now() - interval '${index} hours'`,
          `from public.wishlists where share_id = ${sql(shareId)}`,
        ]
        if (claimedBy) {
          lines.push(
            `with item as (`,
            ...insertItem.map((line) => `  ${line}`),
            `  returning id`,
            `)`,
            `insert into public.purchases (item_id, gifter_name) select id, ${sql(claimedBy)} from item;`,
          )
        } else {
          lines.push(...insertItem.slice(0, -1), `${insertItem.at(-1)};`)
        }
      })
    }
  }
  lines.push('', 'commit;', '')
  return lines.join('\n')
}

const users = []
for (const person of PEOPLE) {
  users.push(await ensureUser(person))
}

const outFile = path.join(root, 'supabase', 'seed.generated.sql')
writeFileSync(outFile, buildSeedSql(users))

console.log('Test users (sign in with the email, then code 424242):\n')
for (const user of users) {
  const shareIds = user.lists.map((list) => `/w/${shareIdFor(user, list)}`)
  console.log(
    `  ${`${user.first} ${user.last}`.padEnd(13)} ${user.email.padEnd(30)} ${user.created ? 'created' : 'exists '}  ${shareIds.join('  ')}`,
  )
}
console.log(`\nWrote ${path.relative(root, outFile)} — run it in the Supabase SQL editor.`)
