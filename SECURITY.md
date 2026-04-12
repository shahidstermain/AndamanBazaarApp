# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |

## Reporting a Vulnerability

Please report security vulnerabilities by emailing **shahidstalker@gmail.com** rather than opening a public GitHub issue.

You will receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible.

---

## Known Issues Fixed in This PR

### 🔴 HIGH — Secrets Detected

| File                    | Issue                                                      | Status                                                        |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `.idx/mcp.json`         | Hardcoded Hostinger API token (Base64 high entropy string) | ✅ Fixed — replaced with `${input:api_token}` prompt variable |
| `.vscode/settings.json` | Embedded OpenSSH private key                               | ✅ Fixed — replaced with local path `~/.ssh/id_ed25519`       |
| `ghdeploykey`           | SSH deploy private key committed to repo                   | ✅ Resolved — file removed, patterns added to `.gitignore`    |

> ⚠️ **Action required**: Since these keys were committed to git history, you **must** rotate/revoke them immediately even though the files have been cleaned up:
>
> - Revoke the Hostinger API token from your Hostinger dashboard
> - Revoke the SSH deploy key from your server/cPanel authorized_keys
> - Generate a new deploy key and store it only as a GitHub Actions secret

### 🟡 MEDIUM — CI Workflow Over-Privileged

| File                       | Issue                                                 | Status                                                    |
| -------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `.github/workflows/ci.yml` | Top-level `permissions: write-all` (implicit default) | ✅ Fixed — restricted to `contents: read, packages: read` |

### 🟠 HIGH — Vulnerable Dependencies (SCA)

| Package     | Version | CVEs                                                 | Fixed Version | Status                                           |
| ----------- | ------- | ---------------------------------------------------- | ------------- | ------------------------------------------------ |
| `happy-dom` | 12.10.3 | CVE-2025-61927 (Critical), CVE-2024-51757 (Critical) | 20.0.0        | ✅ Upgraded                                      |
| `fastify`   | 4.26.1  | CVE-2026-25224 (High 7.5), CVE-2026-25223 (Low 3.7)  | 5.7.3         | ✅ Removed during Supabase to Firebase migration |

### 🟡 LOW — Dockerfile Security

| Issue                                         | Status                                     |
| --------------------------------------------- | ------------------------------------------ |
| Container running as root (no USER directive) | ✅ Fixed — added `appuser` non-root user   |
| No HEALTHCHECK instruction                    | ✅ Fixed — added `wget`-based health check |

### 🔵 LOW — Missing Subresource Integrity (SRI)

27 stitch HTML prototype files are missing `integrity` attributes on externally-hosted `<script>` and `<link>` tags (CWE-353). These are design mockups, not production code, but should be addressed:

**Quick fix** — add `integrity` and `crossorigin` to every CDN tag:

```html
<!-- Before -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- After -->
<script
  src="https://cdn.tailwindcss.com"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>
```

Generate hashes via: https://www.srihash.org/

### 🟡 MEDIUM — Highly Complex Functions

| File                                        | Maintainability Index | Action                                                       |
| ------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| `src/pages/AuthView.tsx`                    | 24                    | Decompose into sub-components                                |
| `src/lib/postAdUtils.ts` → `saveDraft`      | 20                    | Extract upload, validation, DB steps into separate functions |
| `src/lib/security.ts`                       | 18                    | Split into focused utility modules                           |
| `functions/src/payments/createInvoice.ts`   | 17                    | Add early-return guards, extract helpers                     |
| `functions/src/payments/cashfreeWebhook.ts` | 26                    | Extract payment verification logic                           |

### 🔵 LOW — Duplicate Code (19,517 duplicated lines)

119 duplicate code groups were identified, mostly in `stitch/` HTML prototype files (expected) and test files. The actionable items:

- **`tailwind.config.js`** — consolidate duplicate theme extension blocks (Groups 9–11)
- **`tests/e2e/`** — extract shared Playwright setup/teardown into `tests/fixtures/` (Groups 1–5)
- **`src/pages/Home.tsx`** — extract repeated card component (Group 6)
- **`src/pages/ContactUs.tsx` / `About.tsx`** — share a `PageHeader` component (Group 7)
- **`src/pages/PrivacyPolicy.tsx` / `TermsOfService.tsx`** — share a `LegalPage` wrapper (Group 8)

### 🔵 LOW — Dead Code (18 instances)

Run `npx knip` or review the static analysis report to identify and remove unused exports, components, and utilities.

---

## Security Checklist for Contributors

- [ ] Never commit API keys, tokens, passwords, or private keys
- [ ] Use GitHub Secrets for all sensitive CI/CD values
- [ ] Add SRI hashes to all CDN resources
- [ ] Run `npm audit` before submitting a PR
- [ ] Keep dependencies up to date — check monthly
- [ ] Firebase Security Rules (Firestore/Storage) must be reviewed for every new collection/path
- [ ] All server-side inputs must be validated with Zod schemas
