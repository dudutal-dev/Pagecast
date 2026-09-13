# אבטחה, Database Design, CI/CD Pipeline, Docker

> קובץ זה פוצל מ-SKILL.md לטובת טעינה לפי דרישה.

## שלב 6 — אבטחה (Security Checklist)

כל אפליקציה חייבת לעמוד ב-OWASP Top 10:

```typescript
// ✅ Input Validation — Zod תמיד
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

// ✅ SQL Injection Prevention — Prisma/parameterized queries
// אף פעם לא: db.query(`SELECT * FROM users WHERE id = ${id}`)
// תמיד: db.user.findUnique({ where: { id } })

// ✅ Auth Headers
const headers = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ✅ Rate Limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

// ✅ Password Hashing
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);
```

**Secrets Management:**
- `.env` — פיתוח מקומי בלבד
- `.env.example` — תמיד ב-git (ללא ערכים אמיתיים)
- `.env` — תמיד ב-`.gitignore`
- Production: environment variables ב-platform (Vercel, Railway, AWS)

---

## שלב 7 — Database Design

### Prisma Schema Template
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  role      Role      @default(USER)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  sessions  Session[]
  posts     Post[]
  
  @@index([email])
  @@map("users")
}

enum Role {
  USER
  ADMIN
}
```

### Migration Workflow
```bash
# פיתוח
npx prisma migrate dev --name add_user_table

# Production
npx prisma migrate deploy

# Seeding
npx prisma db seed
```

---

## שלב 8 — CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb

      - name: Type Check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Unit & Integration Tests
        run: npm run test:coverage

      - name: E2E Tests
        run: npx playwright test

      - name: Upload Coverage
        uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: echo "Deploy step here (Vercel/Railway/AWS)"
```

---

## שלב 9 — Docker

```dockerfile
# Dockerfile (Multi-stage)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml (Development)
version: '3.9'
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [db, redis]
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

---
