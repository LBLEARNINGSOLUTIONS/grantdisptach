# Dispatch Daily Checklist

Fast-click checklist for dispatcher follow-through (not a truck status board).

## Stack
- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- NextAuth (credentials)
- Tailwind CSS

## Setup
1. Copy env:
   ```bash
   cp .env.example .env
   ```
2. Start Postgres:
   ```bash
   docker compose up -d
   ```
3. Install deps and migrate:
   ```bash
   npm install
   npm run prisma:migrate
   npm run prisma:generate
   npm run seed
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```

## Default login
- Email: `dispatcher@example.com`
- Password: `dispatch`

## Seed config
Edit `config/seed.ts` to update the default driver list and column headers without touching code logic.

## Notes
- Columns added in the Manage view default to temporary and expire after 14 days unless promoted.
- Deactivate instead of deleting drivers/columns; all updates are logged in `audit_log`.
