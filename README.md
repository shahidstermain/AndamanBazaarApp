# AndamanBazaar Water Adventures Platform

Full-stack monorepo for listing Andaman water adventures and capturing booking leads.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Zod
- **Database**: PostgreSQL + Prisma ORM (migrations + seed)
- **Notifications**: Pluggable providers (Nodemailer local + SendGrid placeholder) + webhook retry/backoff
- **Tests**:
  - Backend: Jest + Supertest
  - Frontend: React Testing Library + Vitest
- **Infra**: Docker + Docker Compose + GitHub Actions

## Features

- Public listing pages:
  - `/` Featured activities + filter/search
  - `/activities` Paginated all activities
  - `/activities/:slug` Activity details with booking CTA
- Lead capture form with validation and prefill from activity pages
- Success message after lead submission:
  - **"Thank you — we usually reach out within 12 hours of submission. Kindly wait."**
- Admin lead management:
  - `/admin/leads`
  - Filter by status (`new`, `contacted`, `confirmed`)
  - Update lead status
  - Protected via API key or basic auth
- Lead notifications:
  - Email to operator
  - Optional webhook POST with retry/backoff
- Rate limiting for lead creation (10 requests/IP/hour)

---

## Project Structure

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── scripts/
│   │   ├── export-leads-csv.ts
│   │   └── init.sh
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── ...
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── ...
│   └── ...
├── docs/
│   └── api-contract.json
├── docker-compose.yml
├── postman_collection.json
└── .github/workflows/ci.yml
```

---

## Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Required keys:

- `DATABASE_URL`
- `PORT`
- `ADMIN_API_KEY`
- `OPERATOR_EMAIL`
- `EMAIL_SMTP_HOST`
- `EMAIL_SMTP_PORT`
- `EMAIL_SMTP_USER`
- `EMAIL_SMTP_PASS`
- `LEAD_WEBHOOK_URL`
- `VITE_API_URL`

Optional:

- `ADMIN_BASIC_USER`
- `ADMIN_BASIC_PASS`
- `EMAIL_PROVIDER` (`nodemailer` or `sendgrid`)
- `WEBHOOK_RETRY_ATTEMPTS`
- `WEBHOOK_RETRY_BASE_MS`

---

## Run with Docker (recommended)

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Postgres: localhost:5432

The backend container runs:
1. Prisma generate
2. Prisma migration deploy
3. Prisma seed
4. API server startup

---

## Local Development (without Docker)

### 1) Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Database & Seed Commands

```bash
cd backend
npm run prisma:migrate:deploy
npm run prisma:seed
```

Export leads to CSV:

```bash
cd backend
npm run export:leads -- ./leads.csv
```

---

## Testing

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

---

## Lint & Build

### Backend

```bash
cd backend
npm run lint
npm run build
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

---

## API Quick Examples (curl)

### Get activities with filters

```bash
curl "http://localhost:4000/api/activities?location=North%20Bay&type=Adventure&priceMin=1000&priceMax=8000"
```

### Get one activity by id

```bash
curl "http://localhost:4000/api/activities/<activity_id>"
```

### Create lead

```bash
curl -X POST "http://localhost:4000/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Das",
    "phone": "9876543210",
    "email": "rahul@example.com",
    "preferred_date": "2026-07-20",
    "location": "North Bay",
    "activities": ["Scuba Diving", "Jet Skiing"],
    "adults": 2,
    "children": 0,
    "swimming_ability": "Beginner",
    "budget": 10000,
    "referral_source": "Instagram",
    "special_requests": "Need underwater photos",
    "consent": true
  }'
```

### List admin leads

```bash
curl "http://localhost:4000/api/admin/leads?status=new" \
  -H "x-api-key: <ADMIN_API_KEY>"
```

### Update lead status

```bash
curl -X PATCH "http://localhost:4000/api/admin/leads/<lead_id>" \
  -H "x-api-key: <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted"}'
```

---

## API Contract & Manual Testing

- API contract: `docs/api-contract.json`
- Postman collection: `postman_collection.json`

---

## Make Targets

```bash
make up          # docker compose up --build
make down        # stop containers
make db-init     # run migrations + seed
make backend-test
make frontend-test
```

---

## Deployment Notes

### Option A: Single VM (Docker Compose)
1. Provision VM (Ubuntu)
2. Install Docker + Compose plugin
3. Clone repo and set `.env`
4. Run `docker compose up -d --build`
5. Put reverse proxy (Nginx/Caddy) in front for HTTPS

### Option B: Split deployment
- Deploy backend container to Render/Fly.io/AWS ECS
- Deploy frontend to Vercel/Netlify with `VITE_API_URL` set to backend URL
- Use managed Postgres (Neon/RDS/Supabase Postgres)

