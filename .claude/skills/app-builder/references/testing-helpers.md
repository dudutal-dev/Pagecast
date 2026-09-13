# Testing Helpers — Factories, Fixtures, Utilities

## Test Factories (TypeScript)

```typescript
// tests/factories/userFactory.ts
import { faker } from '@faker-js/faker';

export function createUserFactory(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.cuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createAdminFactory(overrides: Partial<User> = {}): User {
  return createUserFactory({ role: 'ADMIN', ...overrides });
}

// שימוש בבדיקות
const user = createUserFactory({ email: 'specific@test.com' });
const admin = createAdminFactory();
```

## Database Test Helpers

```typescript
// tests/helpers/db.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5432/testdb';

let prisma: PrismaClient;

export function getTestDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL });
  }
  return prisma;
}

export async function seedTestDb() {
  const db = getTestDb();
  await db.user.createMany({
    data: [
      { id: 'seed-user-1', email: 'existing@test.com', name: 'Existing User' },
      { id: 'seed-admin-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
    ],
  });
}

export async function cleanTestDb() {
  const db = getTestDb();
  // מחק בסדר הפוך של FK constraints
  await db.session.deleteMany();
  await db.user.deleteMany();
}
```

## HTTP Test Client

```typescript
// tests/helpers/client.ts
import { NextRequest } from 'next/server';

interface TestResponse {
  status: number;
  body: any;
  headers: Headers;
}

export function createTestClient(defaultHeaders: Record<string, string> = {}) {
  const baseUrl = 'http://localhost:3000';

  async function request(
    method: string,
    path: string,
    options: { json?: any; headers?: Record<string, string> } = {}
  ): Promise<TestResponse> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
        ...options.headers,
      },
      body: options.json ? JSON.stringify(options.json) : undefined,
    });

    const body = await res.json().catch(() => null);
    return { status: res.status, body, headers: res.headers };
  }

  return {
    get: (path: string, opts?: any) => request('GET', path, opts),
    post: (path: string) => ({
      json: (body: any) => request('POST', path, { json: body }),
    }),
    put: (path: string) => ({
      json: (body: any) => request('PUT', path, { json: body }),
    }),
    delete: (path: string) => request('DELETE', path),
  };
}

// יצירת client עם auth
export function createAuthenticatedClient(userId: string) {
  const token = generateTestToken(userId); // מימוש בהתאם ל-auth שלך
  return createTestClient({ Authorization: `Bearer ${token}` });
}
```

## MSW — Mock Service Worker (לבדיקות frontend)

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json({
      data: [
        { id: '1', email: 'mock@test.com', name: 'Mock User' },
      ],
    });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(
      { data: { id: 'new-1', ...body } },
      { status: 201 }
    );
  }),

  http.post('/api/users', () => {
    return HttpResponse.json(
      { error: { code: 'USER_ALREADY_EXISTS' } },
      { status: 409 }
    );
  }, { once: true }), // מופעל פעם אחת בלבד
];

// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Playwright Custom Commands

```typescript
// tests/e2e/helpers/auth.ts
import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', password);
  await page.click('[type=submit]');
  await page.waitForURL('/dashboard');
}

export async function loginAsAdmin(page: Page) {
  return loginAs(page, 'admin@test.com', 'AdminPass123!');
}

// tests/e2e/helpers/setup.ts
export async function setupTestUser(page: Page) {
  // Create via API directly — לא דרך UI כדי לחסוך זמן
  const res = await page.request.post('/api/users', {
    data: { email: 'e2e-test@test.com', name: 'E2E User', password: 'Test123!' },
  });
  return res.json();
}
```

## pytest Fixtures (Python)

```python
# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from app.main import app
from app.core.database import get_db
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "postgresql+asyncpg://postgres:test@localhost:5432/testdb"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def db_session():
    engine = create_async_engine(TEST_DB_URL)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        yield session
        await session.rollback()  # cleanup after each test

@pytest.fixture(scope="function")
async def client(db_session):
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
def user_factory():
    def _create(**kwargs):
        defaults = {
            "email": "test@example.com",
            "name": "Test User",
            "hashed_password": "hashed123",
        }
        return {**defaults, **kwargs}
    return _create
```

## Coverage Reports

```bash
# TypeScript — Vitest
npx vitest run --coverage

# Python — pytest-cov
pytest --cov=app --cov-report=html --cov-report=term-missing

# HTML report נפתח ב-browser
open coverage/index.html
open htmlcov/index.html
```
