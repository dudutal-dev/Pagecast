# אסטרטגיית בדיקות מלאה — Unit / Integration / E2E / Smoke

> קובץ זה פוצל מ-SKILL.md לטובת טעינה לפי דרישה.

## שלב 5 — בדיקות (Testing Strategy)

### פירמידת הבדיקות
```
        ╱▲╲          E2E Tests (10%)
       ╱────╲        → Playwright / Cypress
      ╱──────╲       Integration Tests (30%)
     ╱────────╲      → Supertest / pytest
    ╱──────────╲     Unit Tests (60%)
   ╱────────────╲    → Jest / Vitest / pytest
```

### Unit Tests — TypeScript/Vitest
```typescript
// tests/unit/userService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '@/services/userService';
import { db } from '@/lib/db';

vi.mock('@/lib/db');

describe('userService.createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create user successfully', async () => {
    const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser);

    const result = await userService.createUser({
      email: 'test@test.com',
      name: 'Test',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@test.com');
    }
  });

  it('should return error if user already exists', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: '1', email: 'test@test.com' } as any);

    const result = await userService.createUser({ email: 'test@test.com', name: 'Test' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('UserAlreadyExistsError');
    }
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(db.user.findUnique).mockRejectedValue(new Error('DB connection failed'));

    const result = await userService.createUser({ email: 'test@test.com', name: 'Test' });

    expect(result.success).toBe(false);
  });
});
```

### Integration Tests — API Routes
```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, seedTestDb, cleanTestDb } from '../helpers';

describe('POST /api/users', () => {
  beforeAll(async () => { await seedTestDb(); });
  afterAll(async () => { await cleanTestDb(); });

  it('creates a user and returns 201', async () => {
    const client = createTestClient();
    const res = await client.post('/api/users').json({
      email: 'new@test.com',
      name: 'New User',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'new@test.com' });
  });

  it('returns 409 for duplicate email', async () => {
    const client = createTestClient();
    await client.post('/api/users').json({ email: 'existing@test.com', name: 'A' });
    const res = await client.post('/api/users').json({ email: 'existing@test.com', name: 'B' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
  });
});
```

### E2E Tests — Playwright
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can sign up and access dashboard', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('[name=email]', 'e2e@test.com');
    await page.fill('[name=password]', 'SecurePass123!');
    await page.click('[type=submit]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /ברוך הבא/i })).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'user@test.com');
    await page.fill('[name=password]', 'wrongpassword');
    await page.click('[type=submit]');

    await expect(page.getByText(/סיסמה שגויה/i)).toBeVisible();
  });
});
```

### Python Tests — pytest
```python
# tests/unit/test_user_service.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.user_service import UserService
from app.schemas.user import UserCreateDto

@pytest.fixture
def user_service(mock_db):
    return UserService(db=mock_db)

class TestCreateUser:
    async def test_creates_user_successfully(self, user_service, mock_db):
        mock_db.user.find_by_email.return_value = None
        mock_db.user.create.return_value = {"id": "1", "email": "test@test.com"}
        
        result = await user_service.create_user(
            UserCreateDto(email="test@test.com", name="Test")
        )
        
        assert result.success is True
        assert result.data["email"] == "test@test.com"

    async def test_raises_error_for_duplicate_email(self, user_service, mock_db):
        mock_db.user.find_by_email.return_value = {"id": "existing"}
        
        result = await user_service.create_user(
            UserCreateDto(email="existing@test.com", name="Test")
        )
        
        assert result.success is False
        assert result.error.code == "USER_ALREADY_EXISTS"
```

### Coverage Configuration
```json
// vitest.config.ts
{
  coverage: {
    provider: 'v8',
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    exclude: ['tests/**', '**/*.d.ts', 'prisma/**']
  }
}
```

---
