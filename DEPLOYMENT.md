# Deployment Guide

This guide walks through deploying Readiscover to production.

## Prerequisites

- GitHub account
- Cloudflare account
- Domain: `7vik.io` configured in Cloudflare
- Node.js v18+ installed locally

## Part 1: Backend Deployment (Cloudflare Worker)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate.

### Step 3: Deploy Worker

```bash
npm run deploy
```

The worker will be deployed and you'll get a URL like:
```
https://readiscover-api.<your-subdomain>.workers.dev
```

### Step 4: Configure Custom Domain

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages → readiscover-api
3. Click "Triggers" → "Custom Domains"
4. Add custom domain: `api.readiscover.7vik.io`
5. Cloudflare will automatically handle DNS

### Step 5: Test Backend

```bash
curl https://api.readiscover.7vik.io/health
```

Expected response:
```json
{"status":"ok","service":"readiscover-api"}
```

## Part 2: Frontend Deployment (GitHub Pages)

### Step 1: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Readiscover v1.0"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create repository: `readiscover`
3. Don't initialize with README (we already have one)

### Step 3: Push to GitHub

```bash
git remote add origin https://github.com/7vik/readiscover.git
git branch -M main
git push -u origin main
```

### Step 4: Enable GitHub Pages

1. Go to repository Settings
2. Navigate to Pages (left sidebar)
3. Source: Select "Deploy from a branch"
4. Branch: Select `main` and `/ (root)`
5. Click Save

GitHub will deploy the site to:
```
https://7vik.github.io/readiscover/
```

### Step 5: Configure Custom Domain

1. In GitHub Pages settings, under "Custom domain"
2. Enter: `readiscover.7vik.io`
3. Click Save

### Step 6: Configure DNS in Cloudflare

1. Go to Cloudflare Dashboard → DNS
2. Add CNAME record:
   ```
   Type: CNAME
   Name: readiscover
   Target: 7vik.github.io
   Proxy status: Proxied (orange cloud)
   ```
3. Save

### Step 7: Wait for DNS Propagation

DNS changes can take a few minutes to propagate. Check status:

```bash
dig readiscover.7vik.io
```

### Step 8: Enable HTTPS

In GitHub Pages settings:
- Check "Enforce HTTPS"
- Wait for certificate provisioning (can take up to 24 hours)

### Step 9: Test Frontend

Visit: https://readiscover.7vik.io

You should see the landing page.

## Part 3: Verification

### Test Complete Flow

1. Visit https://readiscover.7vik.io
2. Enter a test arXiv ID: `2401.01234`
3. Enter your OpenRouter API key
4. Click "Begin Readiscovery"
5. Verify:
   - Loading steps progress
   - Paper loads successfully
   - Chat interface appears
   - Dialogue works

### Monitor Logs

Cloudflare Worker logs:
```bash
npx wrangler tail
```

## Part 4: Updates

### Update Backend

```bash
# Make changes to worker/src/*
npm run deploy
```

### Update Frontend

```bash
# Make changes to index.html, styles.css, main.js
git add .
git commit -m "Update: <description>"
git push origin main
```

GitHub Pages will automatically rebuild.

## Troubleshooting

### Backend not responding

1. Check worker logs: `npx wrangler tail`
2. Verify deployment: `npm run deploy`
3. Check DNS: `dig api.readiscover.7vik.io`

### Frontend not loading

1. Check GitHub Pages status in repository settings
2. Verify DNS: `dig readiscover.7vik.io`
3. Clear browser cache
4. Check browser console for errors

### CORS errors

1. Verify worker is deployed with correct CORS headers
2. Check API_BASE_URL in main.js matches your worker URL
3. Ensure custom domain is configured correctly

### Session not starting

1. Verify OpenRouter API key is valid
2. Check worker logs for errors
3. Test arXiv source availability manually:
   ```bash
   curl https://arxiv.org/src/<arxiv-id>
   ```

## Security Notes

- API keys are never logged or stored
- Sessions are ephemeral (30-minute timeout)
- No persistence layer
- All data destroyed after session ends
- HTTPS enforced on both frontend and backend

## Performance

- Cloudflare Workers: Global edge network, <50ms latency
- GitHub Pages: CDN-backed, cached assets
- Expected load: ~10 concurrent users
- No database or storage costs

## Costs

- Cloudflare Workers: Free tier sufficient (100k requests/day)
- GitHub Pages: Free for public repositories
- Domain: ~$12/year (already owned)
- Total additional cost: $0/month

---

**Production URLs:**
- Frontend: https://readiscover.7vik.io
- Backend: https://api.readiscover.7vik.io
