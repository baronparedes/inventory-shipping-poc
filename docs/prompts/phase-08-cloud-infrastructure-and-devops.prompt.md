---
mode: agent
description: Phase 8 — Cloud Infrastructure, Containerization, and CI/CD
---

# Phase 8: Cloud Infrastructure & DevOps

## Context

The application is fully tested from Phase 7. This phase containerizes both services, sets up CI/CD pipelines, and deploys to cloud infrastructure. The target deployment platform is **Railway** (primary, simpler) or **AWS ECS + RDS + CloudFront** (enterprise). Instructions below are written for Railway with notes for AWS equivalents.

---

## 1. Containerization

### `apps/api/Dockerfile`

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies (production only)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @inventory/api... --prod

# Build shared package
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inventory/shared build
RUN pnpm --filter @inventory/api build

# Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

### `apps/web/Dockerfile`

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inventory/shared build
RUN pnpm --filter @inventory/web build

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `apps/web/nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Serve React app — all paths fall through to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api calls to the backend service
    location /api/ {
        proxy_pass http://api:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### `.dockerignore` (root)

```
node_modules
.git
dist
.env
*.local
coverage
playwright-report
```

### `docker-compose.yml` (local dev/testing)

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: inventory
      POSTGRES_PASSWORD: inventory
      POSTGRES_DB: inventory_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://inventory:inventory@db:5432/inventory_db
      JWT_SECRET: local-dev-secret-at-least-32-chars
      JWT_EXPIRES_IN: 1d
      CORS_ORIGIN: http://localhost:80
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - db

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  pgdata:
```

---

## 2. CI/CD Pipeline

### GitHub Actions — Main Workflow (`.github/workflows/ci-cd.yml`)

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_API: ghcr.io/${{ github.repository }}/api
  IMAGE_WEB: ghcr.io/${{ github.repository }}/web

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: {node-version: 22, cache: pnpm}
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: inventory_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    env:
      DATABASE_URL_TEST: postgresql://test:test@localhost:5432/inventory_test
      JWT_SECRET: test-secret-must-be-at-least-32-chars
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: {node-version: 22, cache: pnpm}
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @inventory/api db:migrate:test
      - run: pnpm test

  build-and-push:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: ${{ env.IMAGE_API }}:${{ github.sha }},${{ env.IMAGE_API }}:latest
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          tags: ${{ env.IMAGE_WEB }}:${{ github.sha }},${{ env.IMAGE_WEB }}:latest

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy API to Railway
        run: railway up --service api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      - name: Deploy Web to Railway
        run: railway up --service web
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 3. Railway Deployment (Primary)

### Setup Steps

1. Install Railway CLI: `npm install -g @railway/cli`
2. Create a new Railway project: `railway init`
3. Add services:
   - **PostgreSQL** — Railway managed database
   - **API** — from `apps/api/Dockerfile`, root context
   - **Web** — from `apps/web/Dockerfile`, root context
4. Set environment variables in Railway dashboard for the API service:
   - `DATABASE_URL` — auto-linked from Railway PostgreSQL service
   - `JWT_SECRET` — generate with `openssl rand -base64 48`
   - `JWT_EXPIRES_IN=1d`
   - `CORS_ORIGIN` — the Railway-generated web service URL
   - `NODE_ENV=production`
5. Set environment variable for the Web service:
   - `VITE_API_BASE_URL` — Railway API service URL (used at build time)

### Railway Configuration (`railway.toml`)

```toml
[build]
  builder = "DOCKERFILE"

[[services]]
  name = "api"
  dockerfilePath = "apps/api/Dockerfile"
  rootDirectory = "."
  startCommand = "sh -c 'npx prisma migrate deploy && node dist/index.js'"
  healthcheckPath = "/api/health"

[[services]]
  name = "web"
  dockerfilePath = "apps/web/Dockerfile"
  rootDirectory = "."
```

---

## 4. AWS Deployment (Enterprise Alternative)

If Railway is not used, deploy to AWS with this architecture:

```
Internet → CloudFront → S3 (web static assets)
                     → ALB → ECS Fargate (API containers)
                                        ↓
                               RDS PostgreSQL (private subnet)
```

### Infrastructure (Terraform)

Create `infra/` at the monorepo root with Terraform modules for:

- **VPC** with public and private subnets across 2 AZs
- **RDS** PostgreSQL 16 in private subnet, encrypted at rest, automated backups enabled
- **ECS Cluster** with Fargate task definition for the API
- **ALB** (Application Load Balancer) with HTTPS listener (ACM certificate)
- **ECR** repositories for API and web Docker images
- **S3 + CloudFront** for serving the React static build
- **Secrets Manager** for `JWT_SECRET` and `DATABASE_URL`

### AWS Deployment Pipeline

In the GitHub Actions deploy step, replace Railway with:

```yaml
- name: Deploy to ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: infra/task-definition.json
    service: inventory-api
    cluster: inventory-cluster
    wait-for-service-stability: true
```

---

## 5. Database Migrations in Production

- Migrations run automatically on API container startup via `prisma migrate deploy`
- Never run `prisma migrate dev` in production (it can prompt and drop data)
- For rollback: maintain a rollback migration file or restore from RDS automated snapshot
- Enable RDS automated backups (retention: 7 days minimum)

---

## 6. Environment-Specific Builds

The web app is built with `VITE_API_BASE_URL` baked in at build time. For multi-environment support:

- **Staging**: build with `VITE_API_BASE_URL=https://api.staging.yourdomain.com`
- **Production**: build with `VITE_API_BASE_URL=https://api.yourdomain.com`

Add separate GitHub Actions jobs for `staging` (on push to `develop`) and `production` (on push to `main`).

---

## Acceptance Criteria

- [ ] `docker-compose up` starts the full stack locally (db, api, web)
- [ ] `POST /api/health` returns 200 in the containerized environment
- [ ] Prisma migrations run automatically on API container start
- [ ] `pnpm lint && pnpm typecheck && pnpm test` must pass before any deploy job runs
- [ ] Docker images are published to GHCR on every push to `main`
- [ ] API is deployed to Railway (or ECS) and accessible via HTTPS
- [ ] Web is deployed and loads correctly, with API calls proxied through nginx
- [ ] Database is not publicly accessible (private subnet in AWS, or Railway internal network)
- [ ] All secrets are stored in GitHub Secrets / Railway / AWS Secrets Manager — never in code
- [ ] Rolling deployments with no downtime (ECS) or zero-downtime restarts (Railway)
