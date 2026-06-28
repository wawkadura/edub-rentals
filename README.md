# edub · rentals

Libya Villa Business — accounting interface. 4 villas, joint ownership
between Walid + Sofian. Tracks rents, expenses, partner transfers, and
the per-partner solde. Currency: LYD. Mobile-first PWA, derrière Authelia
SSO, deployed on **https://rentals.edub.fr**.

---

## Stack

**Frontend**
- Vite + React 19 + TypeScript
- Tailwind CSS v4
- zustand (state)
- Recharts (chart)
- lucide-react (icons)

**Backend**
- Fastify + Node (`server/`)
- **SQLite** via `better-sqlite3` + Drizzle ORM + drizzle-kit (migrations)
- PM2 process `edub-rentals-api` (port 3007)

**Déploiement** : nginx + SSL Letsencrypt + Authelia SSO include, PWA shell.

---

## 📦 Où vit la data

**Une seule base SQLite** :

```
/home/ubuntu/apps/edub-rentals/data/rentals.sqlite
```

WAL mode → `sqlite3 .backup` safe pendant que l'API tourne. 2 tables :

| Table | Contenu |
|---|---|
| `record` | Toutes les transactions (id, transaction, amount LYD, date, paid_by, beneficiary, nature, tags, notes, archive, hide) |
| `action_log` | Audit trail — chaque modif de cellule avec before/after, drive la page `/history` |

Schéma Drizzle : `server/db/schema.ts`. Migrations versionnées dans
`drizzle/`, appliquées au boot via `server/db/migrate.ts`.

---

## 🔁 Backup

La DB est intégrée dans `edub-backup` :
- Cron nightly 04:17 UTC + dimanche → `sqlite3 .backup` → tar+GPG → Drive
- Rétention 7 daily + 8 weekly

Pour ajouter une nouvelle DB ou changer le chemin :
1. Édite `/home/ubuntu/apps/edub-backup/backup.sh`, tableau `SQLITE_DBS`
2. Format : `"<nom>:/chemin/absolu/vers/db.sqlite"`
3. Test : `cd /home/ubuntu/apps/edub-backup && SNAPSHOT_KIND=daily ./backup.sh`
4. Vérifie dans le MANIFEST.txt du snapshot que la DB y est

---

## 🚀 Dev

```sh
npm install
npm run dev                    # vite (3006) + tsx watch server (3007)
npm run build

npm run db:generate            # nouvelle migration Drizzle
npm run db:migrate-from-json   # one-shot import edub-rentals-data → SQLite (legacy)
npm run db:verify-parity       # diff JSON source vs DB
```

---

## 📦 Déploiement

```sh
npm run build
sudo rsync -a --delete dist/ /var/www/rentals.edub.fr/
pm2 restart edub-rentals-api
# Bump SW (public/sw.js → CACHE_VERSION = 'edub-rentals-vN'), rebuild, redeploy
```

---

## 🏛 Architecture

### Routes FE

| Route | Description |
|---|---|
| `/` Aperçu | Headline treasury + 2 partner cards + 2 KPIs + cumul chart |
| `/add` | 2-step minimalist transaction add |
| `/edit/:id` | Edit (re-uses Add flow), exposes Supprimer |
| `/transactions` | Grouped-by-month list, tap row → /edit |
| `/history` | Audit log: browse + revert any past modif (per-field) |

### State + loading

Un seul store `useRecords` avec `loaded` / `ensureLoaded()` / `refresh()`.
Chargé une fois au mount via `useEnsureStores(useRecords)` dans `App.tsx`.
Pull-to-refresh : tire vers le bas depuis le haut → `useRecords.refresh()`,
spinner s'arrête quand la promise résout. Hard refresh (bouton menu) reste
un `window.location.reload()` complet.

Pattern documenté dans `edub-finance/docs/state-architecture.md` (rentals
suit la même architecture, version simplifiée).

### Audit log + history

Chaque POST/PUT/DELETE sur `/api/records` émet des événements per-field
dans `action_log` (target `records.<id>.<field>` ou `records.<id>` pour
create/delete). Exposé via `/api/log` + `/api/log/revert {eventId}`. UI
de browse + revert ciblé à `/history`.

### PWA derrière Authelia

`<link rel="manifest" crossorigin="use-credentials">` est obligatoire
(sinon Chrome ne télécharge pas le manifest, l'install prompt échoue).

---

## 📁 Structure

```
src/                           code FE
  routes/                      Overview, Transactions, Add/Edit, History
  components/                  TransactionFlow + ui/Skeleton
  stores/records.ts            zustand, single store
  lib/                         api, format, types, use-ensure-stores,
                               use-pull-to-refresh

server/                        backend Fastify
  index.ts                     boot + migrate + listen
  db/                          schema, client, migrate
  lib/                         data-store, action-log, summary, types
  routes/                      records, log

drizzle/                       migrations SQL versionnées
scripts/                       migrate-json-to-sqlite, verify-parity, migrate-from-notion (legacy)
data/                          rentals.sqlite runtime (gitignored)
public/                        statics + manifest + sw.js
```

---

## 📜 Historique

Anciennement la data vivait dans un repo GitHub privé
(`wawkadura/edub-rentals-data`) en JSON, avec un per-write git-backup.
Migration → SQLite finalisée le **2026-06-28** (branche
`feature/sqlite-migration` mergée). Le repo data GitHub n'est plus
écrit ; le dossier local `/home/ubuntu/apps/edub-rentals-data/` peut
être archivé / supprimé.

### Domain spec (partner solde)

- **earned(P)** : Σ per-rent shares (fenêtre forward = `[rent_date, next_rent_date)`,
  net = rent − Σ expenses_in_period, share = net/2 + own_advances)
- **withdrawn(P)** : Σ Business → P transfers (tous tags)
- **solde(P)** : invested(P) + earned(P) − withdrawn(P)
- Invariant : `Σ partner soldes == treasury`
- **Reçu (BigCard)** = `distributed` (= cash réellement reçu)

Historique des formules + règle "specials" (records 14/12 + 30/12 traités
comme direct rent dans la modal historique partner) → spec dans
`bots/finance-supervisor/.claude/memory/project_edub_rentals.md`.
