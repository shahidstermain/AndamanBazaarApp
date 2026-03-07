# AndamanBazaar - Local Marketplace for Andaman & Nicobar Islands

A hyper-local marketplace platform connecting islanders across the Andaman & Nicobar Islands. Buy, sell, and trade with verified locals in your community.

## 🏝️ About AndamanBazaar

AndamanBazaar is a community-driven marketplace designed specifically for the unique needs of island life. From fresh catch to local handicrafts, find everything you need from trusted neighbors.

### Key Features
- 🛍️ **Buy & Sell Locally** - List items from fresh fish to electronics
- 💬 **In-App Chat** - Direct messaging with sellers
- 📱 **WhatsApp Integration** - Share listings instantly
- 🏆 **Trust System** - Verified sellers with GPS verification
- ⚡ **Listing Boost** - Promote your listings for more visibility
- 🎯 **Area Filters** - Browse by island/area (Port Blair, Havelock, Neil Island)
- 💰 **Secure Payments** - Cashfree payment integration
- 📊 **Seller Dashboard** - Track views, sales, and performance

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Supabase Auth** for authentication
- **React Router** for navigation
- **React Query** for data fetching
- **Lucide React** for icons

### Backend & Database
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for chat
- **File storage** for listing images
- **Edge Functions** for payment processing

### Infrastructure
- **Firebase Hosting** for web deployment
- **GitHub Actions** for CI/CD
- **cPanel/FTP** for alternative deployment
- **Docker** support for containerization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shahidster1711/AndamanBazaarApp.git
   cd AndamanBazaarApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Fill in your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
AndamanBazaarApp/
├── src/                          # Frontend source code
│   ├── components/               # Reusable React components
│   │   ├── ui/                  # UI component library
│   │   ├── TrustBadge.tsx       # Trust level badges
│   │   └── BoostListingModal.tsx # Payment modal
│   ├── pages/                   # Page components
│   │   ├── Home.tsx             # Homepage with listings
│   │   ├── ListingDetail.tsx    # Individual listing view
│   │   ├── CreateListing.tsx    # Post new listing
│   │   ├── Profile.tsx          # User profile
│   │   └── ChatRoom.tsx         # Messaging interface
│   ├── lib/                     # Utilities and helpers
│   │   ├── supabase.ts          # Supabase client
│   │   ├── localCopy.ts         # Andaman-specific content
│   │   └── validation.ts        # Form validation
│   └── hooks/                   # Custom React hooks
├── supabase/                     # Supabase configuration
│   ├── functions/               # Edge functions
│   │   ├── cashfree-webhook/    # Payment processing
│   │   └── generate-invoice/     # Invoice generation
│   └── migrations/              # Database schema
├── tests/                       # Test suites
│   ├── unit/                   # Unit tests (Vitest)
│   ├── integration/             # Integration tests
│   └── e2e/                    # End-to-end tests (Playwright)
└── docs/                        # Documentation
```

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit          # Run unit tests
npm run test:coverage      # Run with coverage
```

### Integration Tests
```bash
npm run test:integration   # Run integration tests
```

### E2E Tests
```bash
npm run test:e2e          # Run Playwright tests
```

### Security Tests
```bash
npm run test:security     # Run security audit tests
```

## 🚀 Deployment

### Firebase Hosting (Recommended)
```bash
npm run build
npm run firebase-deploy
```

### cPanel/FTP
```bash
npm run build
npm run ftp-deploy
```

### Docker
```bash
docker-compose up --build
```

## 🔧 Environment Variables

Required for development:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

Optional for production:

```env
VITE_CASHFREE_APP_ID=your_cashfree_app_id
VITE_GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

## 📱 Features Deep Dive

### Trust & Verification System
- **GPS Verification**: Sellers verify their location
- **Trust Levels**: Newbie → Verified → Legend
- **Profile Badges**: Visual trust indicators
- **Review System**: Community feedback

### Payment Integration
- **Cashfree**: UPI, cards, net banking
- **Secure Processing**: Server-side webhook verification
- **Listing Boost**: Paid promotion tiers (₹49, ₹99, ₹199)
- **Invoice Generation**: Automatic receipt creation

### Chat & Communication
- **Real-time Messaging**: Instant chat between buyers/sellers
- **Image Sharing**: Send photos in chat
- **Read Receipts**: Message status tracking
- **Quick Replies**: Template responses for sellers

### Local Content & Branding
- **Andamanese Voice**: Local humor and references
- **Island-Specific**: Barge delays, BSNL connectivity, monsoon themes
- **Dynamic Content**: Contextual messaging based on location/time
- **Cultural Connection**: Shared island experiences

## 🔒 Security

- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive form validation
- **Rate Limiting**: API abuse prevention
- **Audit Logging**: Security event tracking
- **Secure Payments**: Webhook signature verification

## 📊 Performance

- **Lazy Loading**: Images and components
- **Code Splitting**: Optimized bundle sizes
- **Caching**: Supabase query caching
- **CDN**: Firebase hosting with global CDN
- **PWA**: Progressive Web App features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use conventional commit messages
- Add tests for new features
- Update documentation
- Ensure security compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏝️ Connect With Us

- **Website**: [andamanbazaar.in](https://andamanbazaar.in)
- **Email**: support@andamanbazaar.in
- **GitHub**: [shahidster1711/AndamanBazaarApp](https://github.com/shahidster1711/AndamanBazaarApp)

---

*Built with ❤️ for the Andaman & Nicobar Islands community*

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

