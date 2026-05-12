# HR Dashboard Pro

A full Next.js HR management dashboard with App Router, Tailwind CSS, TypeScript, Prisma, SQLite, reusable modules, charts, forms, modals, and CRUD APIs.

## What this project includes

- Dashboard overview with KPI cards and charts
- Employee database
- Holidays
- Leave balance
- Loan management
- Salary structure
- Monthly salary
- Search, filter, add, edit, delete
- Real database with Prisma + SQLite
- Easy to upgrade to PostgreSQL / Supabase later

## Run locally

1. Copy environment file

```bash
cp .env.example .env
```

2. Install dependencies

```bash
npm install
```

3. Setup database and seed data

```bash
npm run setup
```

4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`

## Important notes

- SQLite is used so the project works immediately after download.
- Your data will stay saved in `prisma/dev.db`.
- Later you can switch to PostgreSQL / Supabase by changing the Prisma datasource.

## Upgrade to Supabase / PostgreSQL later

Replace `DATABASE_URL` in `.env`, then:

```bash
npx prisma db push
```

## Folder structure

```bash
src/
  app/
  components/
  modules/
  utils/
  lib/
  types/
prisma/
```
