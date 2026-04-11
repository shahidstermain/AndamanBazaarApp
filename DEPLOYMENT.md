# 🚀 AndamanBazaar Deployment Guide

Comprehensive deployment guide for AndamanBazaar marketplace across multiple platforms.

## 📋 Table of Contents

- [Firebase Hosting (Recommended)](#firebase-hosting-recommended)
- [cPanel/FTP Deployment](#cpanel-ftp-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Setup](#environment-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Domain Configuration](#domain-configuration)
- [Monitoring & Logging](#monitoring--logging)

---

## 🔥 Firebase Hosting (Recommended)

Firebase Hosting provides global CDN, SSL certificates, and seamless deployment for React SPAs.

### Prerequisites

- Install Firebase CLI: `npm install -g firebase-tools`
- Create a project in the [Firebase Console](https://console.firebase.google.com/)
- Google account with billing enabled (free tier sufficient for most use cases)

### Step-by-Step Setup

1. **Login to Firebase**:

    ```bash
    firebase login
    ```

2. **Initialize Hosting**:

    ```bash
    firebase init hosting
    ```

    Configuration options:
    - Select your project: Choose existing or create new
    - Public directory: `dist`
    - Configure as single-page app: `Yes`
    - Set up automatic builds: `Yes` (Optional)
    - Overwrite index.html: `No`

3. **Build and Deploy**:

    ```bash
    npm run build
    npm run firebase-deploy
    ```

4. **Custom Domain (Optional)**:

    ```bash
    firebase hosting:sites:create andamanbazaar-web
    firebase hosting:channel:deploy live andamanbazaar-web
    ```

### Firebase Configuration Files

**firebase.json** (auto-generated):
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Environment Variables in Firebase

Set environment variables in Firebase console:

1. Go to Project Settings → Environment variables
2. Add your Supabase credentials:

   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id
   ```

---

## 🌐 cPanel/FTP Deployment

Alternative deployment option for shared hosting environments.

### Prerequisites

- cPanel access with FTP/SFTP
- Node.js support on server (optional)
- SSL certificate recommended

### Manual FTP Deployment

1. **Build the application**:

    ```bash
    npm run build
    ```

2. **Upload files**:

    ```bash
    # Using lftp (recommended)
    lftp -u username,password -e "mirror -R dist/ /public_html/; quit" ftp.yourdomain.com
    
    # Using deploy script
    npm run ftp-deploy
    ```

3. **Configure .htaccess** (already included):

    ```apache
    # SPA routing
    <IfModule mod_rewrite.c>
      RewriteEngine On
      RewriteBase /
      RewriteRule ^index\.html$ - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteCond %{REQUEST_FILENAME} !-d
      RewriteRule . /index.html [L]
    </IfModule>
    
    # Security headers
    <IfModule mod_headers.c>
      Header always set X-Frame-Options DENY
      Header always set X-Content-Type-Options nosniff
      Header always set X-XSS-Protection "1; mode=block"
      Header always set Referrer-Policy "strict-origin-when-cross-origin"
    </IfModule>
    ```

### Automated SFTP Deployment

**deploy-sftp-auto.sh**:
```bash
#!/bin/bash

# Configuration
REMOTE_HOST="your-domain.com"
REMOTE_USER="username"
REMOTE_PATH="/public_html"
LOCAL_PATH="dist"

# Deploy using rsync over SSH
rsync -avz --delete -e "ssh -i ~/.ssh/deploy_key" \
  $LOCAL_PATH/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

echo "Deployment completed!"
```

Make it executable:
```bash
chmod +x deploy-sftp-auto.sh
./deploy-sftp-auto.sh
```

---

## 🐳 Docker Deployment

Containerized deployment for scalable infrastructure.

### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
```

### Deploy with Docker

```bash
# Build and run
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## ⚙️ Environment Setup

### Required Environment Variables

Create `.env` file in project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id

# Payment Integration (Optional)
VITE_CASHFREE_APP_ID=your_cashfree_app_id
VITE_CASHFREE_ENVIRONMENT=production

# AI Integration (Optional)
VITE_GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Environment-Specific Configurations

#### Development (.env.development)
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key
VITE_CASHFREE_ENVIRONMENT=TEST
```

#### Production (.env.production)
```bash
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_prod_anon_key
VITE_CASHFREE_ENVIRONMENT=PROD
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:unit
      
      - name: Build application
        run: npm run build

  deploy-firebase:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
        env:
          FIREBASE_CLI_PREVIEWS: hostingchannels

  deploy-ftp:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to FTP
        uses: SamKirkland/FTP-Deploy-Action@4.3.0
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist
          server-dir: /public_html/
```

### Required GitHub Secrets

- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON
- `FTP_SERVER`: Your FTP server address
- `FTP_USERNAME`: FTP username
- `FTP_PASSWORD`: FTP password

---

## 🌍 Domain Configuration

### Custom Domain with Firebase

1. **Add domain in Firebase Console**:
   - Go to Hosting → Custom domains
   - Add your domain (e.g., andamanbazaar.in)

2. **Update DNS records**:
   ```
   A record: @ → 199.36.158.100 (Firebase Hosting IP)
   CNAME record: www → ghs.googlehosted.com
   ```

3. **Verify domain**:
   - Firebase will provide verification records
   - Add TXT/CNAME records to your DNS

### SSL Certificate

- **Firebase**: Automatic SSL provided
- **cPanel**: Usually auto-generated via Let's Encrypt
- **Docker**: Use certbot or Cloudflare SSL

---

## 📊 Monitoring & Logging

### Firebase Hosting Monitoring

- **Usage Analytics**: Firebase Console → Hosting
- **Performance**: Page load times, error rates
- **Custom Events**: Track user interactions

### Application Logging

Add error tracking to your app:

```typescript
// src/lib/analytics.ts
export const trackError = (error: Error, context?: any) => {
  console.error('App Error:', error, context);
  
  // Send to error tracking service
  if (import.meta.env.PROD) {
    // Firebase Crashlytics or Sentry
  }
};

export const trackEvent = (eventName: string, params?: any) => {
  console.log('Event:', eventName, params);
  
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};
```

### Performance Monitoring

```typescript
// src/lib/performance.ts
export const measurePageLoad = () => {
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    
    trackEvent('page_load_time', { 
      duration: Math.round(loadTime),
      page: window.location.pathname 
    });
  }
};
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

#### 2. Deployment Fails
```bash
# Check Firebase login
firebase login:list

# Test build locally
npm run build && npm run preview
```

#### 3. Routing Issues
- Ensure SPA routing is configured
- Check .htaccess or nginx.conf
- Verify 404 handling

#### 4. Environment Variables
- Double-check variable names
- Ensure VITE_ prefix for frontend variables
- Verify Firebase environment variables are set

### Debug Commands

```bash
# Firebase deployment debug
firebase deploy --debug

# Build with verbose output
npm run build -- --verbose

# Check network requests
npm run dev -- --host
```

---

## 📱 Post-Deployment Checklist

- [ ] Application loads correctly
- [ ] All pages navigate properly
- [ ] Authentication works
- [ ] Images upload correctly
- [ ] Payment processing functions
- [ ] Error pages display (404, 500)
- [ ] SSL certificate valid
- [ ] Performance metrics acceptable
- [ ] Mobile responsive
- [ ] Accessibility compliance

---

## 🆘 Support

For deployment issues:

1. **Firebase**: Check [Firebase documentation](https://firebase.google.com/docs/hosting)
2. **cPanel**: Contact your hosting provider
3. **Docker**: Review Docker logs
4. **Application**: Check browser console for errors

---

*Last updated: March 7, 2026*
