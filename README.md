# edub · rentals

Libya Villa Business — accounting interface.

Two houses × 2 owners (Walid + Sofian) in Libya. Tracks transactions
(investments, rent, maintenance, distributions, paying back) and per-
participant balances.

Currency: LYD.

## Dev

```sh
npm install
npm run migrate   # one-shot import from Notion CSV (only on first install)
npm run dev       # vite on :3006, fastify on :3007
```

## Deploy

Live at https://rentals.edub.fr (htpasswd-protected).
Data lives in the private `wawkadura/edub-rentals-data` repo, auto-pushed
on every mutation.

## Stack

- Vite + React 19 + TypeScript
- Tailwind v4
- Recharts, lucide-react, zustand, react-router-dom
- Fastify + JSON-file storage (atomic tmp+rename)
- PWA with service worker
