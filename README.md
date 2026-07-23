# SpiltUp

SpliitUp — trip budget splitting app. Track shared expenses, record cash handovers, and auto-net settlements with the fewest transactions. Built with Next.js 16, Prisma (SQLite/Turso), Tailwind, and Bun.

## Run locally

```bash
bun install
echo "DATABASE_URL=file:../db/custom.db" > .env
bun run db:push
bun run dev   # http://localhost:2000
```

## Deploy (Vercel + Turso)

1. Import this repo on [vercel.com](https://vercel.com).
2. Create a free database at [turso.tech](https://turso.tech).
3. Set env vars in Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `DATABASE_URL=file:./dev.db` (placeholder for Prisma generate).

The app automatically uses Turso when `TURSO_DATABASE_URL` is set, and the local SQLite file otherwise.
