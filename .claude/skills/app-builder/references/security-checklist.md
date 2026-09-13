# Security Checklist — OWASP Top 10 + Best Practices

## A01 — Broken Access Control
- [ ] כל route מוגן ב-middleware / decorator
- [ ] Authorization checks בשכבת ה-service (לא רק ב-route)
- [ ] Resource ownership validation (`userId === resource.userId`)
- [ ] Role-based access control (RBAC) מוגדר ומוגן בבדיקות
- [ ] API endpoints לא חושפים IDs ניחושיים (השתמש CUID/UUID)

```typescript
// ✅ Resource ownership check
async function updatePost(postId: string, userId: string, data: UpdatePostDto) {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new NotFoundError();
  if (post.authorId !== userId) throw new ForbiddenError(); // ← חשוב!
  return db.post.update({ where: { id: postId }, data });
}
```

## A02 — Cryptographic Failures
- [ ] HTTPS בכל מקום (redirect HTTP → HTTPS)
- [ ] TLS 1.2+ בלבד
- [ ] Passwords — bcrypt/argon2 עם salt rounds ≥ 12
- [ ] JWT secrets — לפחות 256 bits, נשמרים ב-env vars
- [ ] Sensitive data לא נשמר ב-logs (redact passwords, tokens)
- [ ] PII לא ב-URL parameters

```typescript
// ✅ Secure password hashing
import argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64MB
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

## A03 — Injection
- [ ] ORM בכל DB access (לא raw SQL string concatenation)
- [ ] Parameterized queries אם raw SQL נחוץ
- [ ] Input sanitization לפני HTML rendering
- [ ] Zod/Joi validation על כל input

```typescript
// ✅ Prisma — safe by default
const user = await db.user.findUnique({ where: { email } });

// ✅ Raw SQL אם חייבים — parameterized בלבד
const users = await db.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ❌ לעולם לא
const users = await db.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

## A04 — Insecure Design
- [ ] Threat modeling בשלב הארכיטקטורה
- [ ] Rate limiting על כל API endpoint
- [ ] Account lockout לאחר X failed logins
- [ ] CAPTCHA על forms ציבוריים רגישים

## A05 — Security Misconfiguration
- [ ] Headers אבטחה ב-middleware
- [ ] CORS מוגדר ל-whitelist ספציפי (לא `*` ב-production)
- [ ] Default credentials שונו
- [ ] Stack traces לא חשופים ב-production

```typescript
// next.config.js — Security Headers
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  },
];
```

## A07 — Identification & Authentication Failures
- [ ] Password complexity requirements
- [ ] Email verification לאחר רישום
- [ ] Secure session management (httpOnly cookies)
- [ ] Session invalidation ב-logout
- [ ] "Forgot password" עם secure tokens (time-limited)

```typescript
// ✅ Secure cookie settings
res.cookie('session', token, {
  httpOnly: true,   // לא נגיש ל-JavaScript
  secure: true,     // HTTPS בלבד
  sameSite: 'lax',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ימים
});
```

## A08 — Software & Data Integrity
- [ ] npm audit / pip-audit בCI/CD
- [ ] Subresource Integrity (SRI) לCDN assets
- [ ] Dependency pinning (`package-lock.json` / `poetry.lock`)

## A09 — Logging & Monitoring Failures
- [ ] כל authentication events נרשמים
- [ ] Failed access attempts נרשמים
- [ ] Sensitive data לא ב-logs
- [ ] Alerting על patterns חשודים

```typescript
// ✅ Structured logging
logger.info({
  event: 'auth.login.success',
  userId,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

logger.warn({
  event: 'auth.login.failed',
  email,  // אוקיי לרשום email של ניסיון כושל
  ip: req.ip,
  reason: 'invalid_password',
});
// לא רושמים: password, token, secret
```

## A10 — Server-Side Request Forgery (SSRF)
- [ ] Whitelist של URLs שמותר לפנות אליהם
- [ ] Block requests ל-internal IPs (169.254.x.x, 10.x.x.x)
- [ ] Validate URL scheme (https בלבד)

---

## Environment Variables Security

```bash
# .env.example — ב-git (ללא ערכים!)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=your-secret-here
REDIS_URL=redis://localhost:6379

# .gitignore — חובה
.env
.env.local
.env.production
*.pem
*.key
```

## npm Dependencies Audit

```bash
# בדיקת vulnerabilities
npm audit

# תיקון אוטומטי
npm audit fix

# דוח מפורט
npm audit --json | jq '.vulnerabilities'
```

## Pre-commit Security Hook

```bash
# .husky/pre-commit
#!/bin/sh
npm run lint
npm audit --audit-level=high
npx tsc --noEmit
```
