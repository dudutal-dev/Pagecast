# Next.js 14+ App Router — Patterns מתקדמים

## Server vs Client Components

```typescript
// ✅ Server Component (default) — DB access, no hooks
// app/users/page.tsx
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.user.findMany(); // ישירות מה-server
  return <UserList users={users} />;
}

// ✅ Client Component — interactivity, hooks
// components/UserList.tsx
'use client';
import { useState } from 'react';

export function UserList({ users }: { users: User[] }) {
  const [filter, setFilter] = useState('');
  // ...
}
```

## Data Fetching Patterns

```typescript
// Parallel fetching — הכי יעיל
export default async function DashboardPage() {
  const [user, stats, notifications] = await Promise.all([
    getUser(),
    getStats(),
    getNotifications(),
  ]);
  return <Dashboard user={user} stats={stats} notifications={notifications} />;
}

// Streaming with Suspense
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsPanel /> {/* loads independently */}
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <ActivityFeed /> {/* loads independently */}
      </Suspense>
    </>
  );
}
```

## API Routes (Route Handlers)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userService } from '@/services/userService';
import { getServerSession } from '@/lib/auth';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }

    // Validation
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    // Business logic
    const result = await userService.createUser(parsed.data);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: result.error.name, message: result.error.message } },
        { status: result.error.statusCode ?? 500 }
      );
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
```

## Middleware — Auth Protection

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/signup', '/api/auth'];

export async function middleware(req: NextRequest) {
  const isPublic = PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get('session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## Server Actions

```typescript
// app/actions/user.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { userService } from '@/services/userService';

export async function updateUserAction(formData: FormData) {
  const name = formData.get('name') as string;
  const result = await userService.updateUser({ name });
  
  if (!result.success) {
    return { error: result.error.message };
  }
  
  revalidatePath('/profile');
  return { success: true };
}
```

## Error Boundaries

```typescript
// app/error.tsx
'use client';
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>משהו השתבש</h2>
      <button onClick={() => reset()}>נסה שוב</button>
    </div>
  );
}

// app/not-found.tsx
export default function NotFound() {
  return <div>הדף לא נמצא</div>;
}
```

## Metadata & SEO

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'My App', template: '%s | My App' },
  description: 'App description',
  openGraph: {
    type: 'website',
    locale: 'he_IL',
  },
};

// app/products/[id]/page.tsx
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await getProduct(params.id);
  return {
    title: product.name,
    description: product.description,
  };
}
```
