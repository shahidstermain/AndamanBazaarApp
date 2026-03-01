# 🏝️ AndamanBazaar

[![CI/CD Pipeline](https://github.com/shahidster1711/AndamanBazaarApp/actions/workflows/ci.yml/badge.svg)](https://github.com/shahidster1711/AndamanBazaarApp/actions/workflows/ci.yml)

**AndamanBazaar** is a modern, full-stack marketplace web application built for the Andaman Islands community. It enables users to create, browse, and manage listings, communicate via real-time chat, and boost their listings with integrated payment processing.

## ✨ Features

- **🛒 Marketplace Listings** – Create, edit, and browse product/service listings with image uploads
- **💬 Real-time Chat** – Communicate with buyers/sellers via integrated chat system
- **🔐 Authentication** – Secure user authentication powered by Supabase Auth
- **📊 User Dashboard** – Manage your listings, view analytics, and track activity
- **⚡ Listing Boost** – Promote listings with integrated Cashfree payment processing
- **📧 Invoice Generation** – Automated invoice creation and email delivery
- **🔒 Security First** – XSS protection, input sanitization, rate limiting, and CSRF protection
- **♿ Accessibility** – WCAG 2.1 Level AA compliant
- **📱 Responsive Design** – Mobile-first design with Tailwind CSS
- **🌐 PWA Ready** – Progressive Web App capabilities for offline access

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, DaisyUI |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Payments** | Cashfree Payment Gateway |
| **AI** | Google Generative AI (optional features) |
| **Testing** | Vitest, Playwright, React Testing Library, axe-core |
| **CI/CD** | GitHub Actions, Docker, Nginx/Caddy |
| **Hosting** | Firebase Hosting / cPanel (rsync deploy) |

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** 9.x or higher
- **Supabase** account and project
- **Firebase CLI** (optional, for Firebase Hosting)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/shahidster1711/AndamanBazaarApp.git
cd AndamanBazaarApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id-here
# Optional: For AI-powered features
VITE_GOOGLE_AI_API_KEY=your-google-ai-key
```

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests (requires Playwright)
npm run test:e2e

# Run security tests
npm run test:security

# Run accessibility tests
npm run test:accessibility

# Generate coverage report
npm run test:coverage

# Run all test suites
npm run test:all
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview production build locally
npm run preview
```

## 🚢 Deployment

### Option 1: Firebase Hosting

```bash
# Login to Firebase
firebase login

# Initialize hosting (first time only)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### Option 2: Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Option 3: cPanel/VPS (rsync)

The CI/CD pipeline automatically deploys to cPanel on push to `main` branch via rsync over SSH.

For more details, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📁 Project Structure

```
AndamanBazaarApp/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities, helpers, and services
│   └── types.ts        # TypeScript type definitions
├── supabase/
│   ├── functions/      # Edge Functions (webhooks, invoices)
│   └── migrations/     # Database migrations
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── e2e/            # End-to-end tests (Playwright)
│   ├── security/       # Security tests
│   └── accessibility/  # Accessibility tests
├── public/             # Static assets
└── stitch/             # Design prototypes (HTML mockups)
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guides for Firebase and cPanel |
| [CI_CD_STRATEGY.md](./CI_CD_STRATEGY.md) | CI/CD pipeline and visual testing strategy |
| [TEST_PLAN.md](./TEST_PLAN.md) | Comprehensive test plan and coverage targets |
| [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) | Performance optimization details |
| [SECURITY.md](./SECURITY.md) | Security policy and vulnerability reporting |

## 🔐 Security

Please report security vulnerabilities by emailing **shahidstalker@gmail.com** rather than opening a public GitHub issue.

See [SECURITY.md](./SECURITY.md) for our full security policy.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and ensure they pass (`npm run test:all`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.

## 📧 Contact

For questions or support, please open an issue or contact the maintainers at **shahidstalker@gmail.com**.
