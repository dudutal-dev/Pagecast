# Deployment Guides — Vercel, Railway, AWS, Docker

## Vercel (Next.js — הכי פשוט)

```bash
# התקנה
npm i -g vercel

# Deploy
vercel --prod

# Environment Variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
```

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

**Database עם Vercel:**
- Vercel Postgres (managed, יקר)
- Supabase (Free tier, excellent)
- Railway Postgres (זול, אמין)
- Neon (serverless Postgres, free tier)

---

## Railway (Full Stack — מומלץ)

```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
```

**Setup:**
1. חבר GitHub repo
2. הוסף Postgres service
3. הוסף Redis service (אם נדרש)
4. הגדר env vars (Railway מזריק `DATABASE_URL` אוטומטית)
5. Deploy!

---

## AWS ECS (Production Scale)

```yaml
# task-definition.json
{
  "family": "my-app",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
      "portMappings": [{ "containerPort": 3000 }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..." }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-app",
          "awslogs-region": "us-east-1"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512"
}
```

**AWS Deploy Pipeline:**
```bash
# Build & Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URL
docker build -t my-app .
docker tag my-app:latest $ECR_URL/my-app:latest
docker push $ECR_URL/my-app:latest

# Update ECS service
aws ecs update-service \
  --cluster my-cluster \
  --service my-app-service \
  --force-new-deployment
```

---

## Docker Production Setup

```dockerfile
# Dockerfile.prod
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

EXPOSE 3000
ENV PORT 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

```yaml
# docker-compose.prod.yml
version: '3.9'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
    depends_on: [app]
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Health Check Endpoint (חובה!)

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
```

---

## Database Migrations ב-Production

```bash
# אסטרטגיה מומלצת: migrate לפני deploy
# כולל ב-CI/CD pipeline:

# 1. Build Docker image
docker build -t my-app:$GIT_SHA .

# 2. Run migrations
docker run --rm \
  -e DATABASE_URL=$PROD_DATABASE_URL \
  my-app:$GIT_SHA \
  npx prisma migrate deploy

# 3. Deploy new version
aws ecs update-service --force-new-deployment ...
```

---

## Monitoring ב-Production

### Uptime Monitoring
- **UptimeRobot** (free) — ping כל דקה
- **Better Stack** (freemium) — incident management

### Error Tracking
```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% בlproduction
});
```

### Metrics
```typescript
// app/api/metrics/route.ts — Prometheus format
export async function GET() {
  const stats = await getAppStats();
  const metrics = `
# HELP app_requests_total Total requests
# TYPE app_requests_total counter
app_requests_total ${stats.totalRequests}

# HELP app_active_users Active users
# TYPE app_active_users gauge
app_active_users ${stats.activeUsers}
`.trim();

  return new Response(metrics, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
```
