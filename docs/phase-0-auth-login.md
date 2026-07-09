# Phase 0 — Authentication & Login System

## Software Requirements Specification

**Project**: WTO Digital Dispute Documentation Platform  
**Phase**: 0 — Foundation: Authentication, Login, Session Management, Route Protection  
**Status**: Approved  
**Date**: 2026-07-08  
**Version**: 1.0  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Routes & Components](#3-routes--components)
4. [Data Flow: Login](#4-data-flow-login)
5. [Component Specifications](#5-component-specifications)
6. [Proxy / Middleware Logic](#6-proxy--middleware-logic)
7. [Supabase Client Setup](#7-supabase-client-setup)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Loading States](#9-loading-states)
10. [Edge Cases](#10-edge-cases)
11. [Acceptance Criteria](#11-acceptance-criteria)

---

## 1. Overview

Phase 0 establishes the authentication foundation for the WTO Digital Dispute Documentation Platform. It transforms the current "Coming Soon" landing page into a functional login page backed by Supabase Auth (email/password), introduces session-based route protection via Next.js 16 proxy middleware, and provides a minimal authenticated dashboard shell that will be expanded in later phases.

### 1.1 Scope

- Replace the static "Coming Soon" hero with a login form overlaid on the existing 3D Globe background
- Implement email/password authentication using Supabase Auth
- Add session management with cookie-based SSR sessions
- Protect `/dashboard/*` routes from unauthenticated access
- Redirect authenticated users away from `/login`
- Build a minimal dashboard shell with sidebar and logout
- Establish the Role-Based Access Control (RBAC) foundation with two roles: `executive_board` and `delegate`

### 1.2 Out of Scope

- Role-specific dashboard content or permissions enforcement
- User registration / signup flow (admin-managed user creation assumed for now)
- Password reset flow
- OAuth / social login providers
- API rate limiting (deferred to later phase)
- Audit logging (deferred to later phase)

### 1.3 Design Constraints

All UI must follow the design tokens defined in `src/app/globals.css` and `DESIGN.md`. The institutional WTO/UN aesthetic must be preserved: wireframe globe, trade route arcs, dark navy palette, Sora typography. Motion must use Framer Motion with reduced-motion support. The login experience should feel like a natural evolution of the existing landing page, not a replacement.

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Client                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │  Login   │  │Dashboard │  │   Supabase SSR Client  │  │
│  │  Page    │  │  Layout  │  │  (cookie-based session)│  │
│  └────┬─────┘  └────┬─────┘  └──────────┬────────────┘  │
│       │             │                    │                │
│       └──────┬──────┘                    │                │
│              │                           │                │
│         ┌────▼────┐                      │                │
│         │  Proxy  │───────────────────────┘                │
│         │(proxy.ts│  reads/auth cookies                   │
│         └────┬────┘                                       │
└──────────────┼────────────────────────────────────────────┘
               │ HTTP
┌──────────────▼────────────────────────────────────────────┐
│                   Next.js 16 Server                        │
│  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │  Supabase SSR   │  │  Server Actions / API Routes │   │
│  │  Client (server)│  │  (future phases)             │   │
│  └────────┬────────┘  └──────────────────────────────┘   │
└───────────┼───────────────────────────────────────────────┘
            │
┌───────────▼───────────────────────────────────────────────┐
│                   Supabase Project                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Auth Service │  │  PostgreSQL  │  │  Storage        │  │
│  │  (email/pwd)  │  │  (profiles)  │  │  (future)       │  │
│  └──────────────┘  └──────────────┘  └────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 2.2 File Layout (new/modified files)

```
src/
├── app/
│   ├── page.tsx                      # MODIFIED — becomes login page
│   ├── layout.tsx                    # UNCHANGED
│   ├── globals.css                   # UNCHANGED
│   ├── login/
│   │   └── page.tsx                  # NEW — dedicated login route (optional, redirects to /)
│   ├── dashboard/
│   │   ├── layout.tsx                # NEW — authenticated layout with sidebar
│   │   ├── page.tsx                  # NEW — welcome / stats placeholder
│   │   └── disputes/
│   │       └── page.tsx              # NEW — placeholder for Phase 1
│   └── auth/
│       ├── callback/
│       │   └── route.ts              # NEW — auth callback (PKCE flow, optional)
│       └── signout/
│           └── route.ts              # NEW — sign-out route handler
├── components/
│   ├── Hero.tsx                      # MODIFIED — becomes LoginForm with globe
│   ├── Globe.tsx                     # MODIFIED — accepts `fading` prop for fade-out
│   ├── LoginForm.tsx                 # NEW — email/password form
│   ├── AuthError.tsx                 # NEW — error display component
│   ├── DashboardSidebar.tsx          # NEW — sidebar navigation
│   ├── DashboardHeader.tsx           # NEW — top bar with user info/logout
│   ├── GlobeBackground.tsx           # NEW — wrapper that renders Globe as ambient bg
│   └── Footer.tsx                    # MODIFIED — can be hidden on dashboard
├── lib/
│   └── supabase/
│       ├── client.ts                 # NEW — browser-side Supabase client
│       ├── server.ts                 # NEW — server-side Supabase client (SSR)
│       └── proxy.ts                  # NEW — proxy helper for session check
└── proxy.ts                          # NEW — Next.js 16 proxy (middleware equivalent)
```

### 2.3 Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>  # for admin operations only
```

The `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for client exposure by Supabase design.

---

## 3. Routes & Components

### 3.1 Route Table

| Path | Auth Required | Component | Description |
|------|--------------|-----------|-------------|
| `/` | No | `Hero` (modified) | Login page with globe background. If user is already authenticated, redirect to `/dashboard`. |
| `/login` | No | Redirect to `/` | Dedicated login alias — redirects to root. |
| `/dashboard` | Yes | `DashboardPage` | Welcome screen with placeholder stats. |
| `/dashboard/disputes` | Yes | `DisputesPage` | Placeholder for Phase 1 dispute list. |
| `/auth/callback` | No | Route handler | PKCE callback for Supabase auth flow. |
| `/auth/signout` | No | Route handler | Clears session and redirects to `/`. |

### 3.2 Component Table

| Component | Type | Location | Description |
|-----------|------|----------|-------------|
| `Hero` | Client | `src/components/Hero.tsx` | Full-screen section that renders `GlobeBackground` + `LoginForm` overlay. Manages fade-out on auth success and redirect. |
| `Globe` | Client | `src/components/Globe.tsx` | Three.js wireframe globe. Accepts `opacity` prop to support fade-out. Modified to allow external opacity control. |
| `GlobeBackground` | Client | `src/components/GlobeBackground.tsx` | Thin wrapper around `Globe` that handles ambient rendering (full-screen, pointer-events none, gradient overlay). |
| `LoginForm` | Client | `src/components/LoginForm.tsx` | Email/password form with validation, loading state, error display, and submit handler. |
| `AuthError` | Client | `src/components/AuthError.tsx` | Animated error alert for auth failures. Accepts `message` string. |
| `DashboardSidebar` | Client | `src/components/DashboardSidebar.tsx` | Left sidebar with navigation links, WTO branding, user role badge, and logout button. |
| `DashboardHeader` | Client | `src/components/DashboardHeader.tsx` | Top bar with page title, user avatar/name, and logout dropdown. |
| `DashboardLayout` | Client | `src/app/dashboard/layout.tsx` | Authenticated layout wrapping all `/dashboard/*` pages. Composes `DashboardSidebar` and `DashboardHeader`. |

---

## 4. Data Flow: Login

### 4.1 Successful Login Sequence

```
User                    LoginForm                supabase/client          Supabase Auth          Proxy/Dashboard
 │                        │                          │                       │                      │
 │  Enter email/password  │                          │                       │                      │
 │───────────────────────>│                          │                       │                      │
 │                        │                          │                       │                      │
 │                        │  Show loading spinner    │                       │                      │
 │                        │  Disable submit button   │                       │                      │
 │                        │  setError(null)          │                       │                      │
 │                        │                          │                       │                      │
 │                        │  signInWithPassword()    │                       │                      │
 │                        │─────────────────────────>│                       │                      │
 │                        │                          │  POST /auth/v1/token  │                      │
 │                        │                          │──────────────────────>│                      │
 │                        │                          │                       │                      │
 │                        │                          │   200 { session,     │                      │
 │                        │                          │   user, access_token }│                      │
 │                        │                          │<──────────────────────│                      │
 │                        │                          │                       │                      │
 │                        │  Session stored in       │                       │                      │
 │                        │  cookies via             │                       │                      │
 │                        │  supabase.auth.setSession│                       │                      │
 │                        │<─────────────────────────│                       │                      │
 │                        │                          │                       │                      │
 │                        │  Set "fading" state      │                       │                      │
 │                        │  → Globe opacity 1→0    │                       │                      │
 │                        │  over 800ms              │                       │                      │
 │                        │                          │                       │                      │
 │                        │  Wait 800ms              │                       │                      │
 │                        │                          │                       │                      │
 │                        │  router.push(/dashboard) │                       │                      │
 │                        │─────────────────────────────────────────────────>│                      │
 │                        │                          │                       │                      │
 │                        │                          │                       │   Verify cookie       │
 │                        │                          │                       │   → redirect /login  │
 │                        │                          │                       │   ← valid session    │
 │                        │                          │                       │                      │
 │  Dashboard renders     │                          │                       │                      │
 │<──────────────────────────────────────────────────────────────────────────│                      │
```

### 4.2 Failed Login Sequence

```
User                    LoginForm                supabase/client          Supabase Auth
 │                        │                          │                       │
 │  Enter email/password  │                          │                       │
 │───────────────────────>│                          │                       │
 │                        │  Show loading spinner    │                       │
 │                        │                          │                       │
 │                        │  signInWithPassword()    │                       │
 │                        │─────────────────────────>│                       │
 │                        │                          │  POST /auth/v1/token  │
 │                        │                          │──────────────────────>│
 │                        │                          │                       │
 │                        │                          │   400 { error:       │
 │                        │                          │   "Invalid login     │
 │                        │                          │   credentials" }      │
 │                        │                          │<──────────────────────│
 │                        │                          │                       │
 │                        │  Return AuthError        │                       │
 │                        │<─────────────────────────│                       │
 │                        │                          │                       │
 │                        │  Hide loading spinner    │                       │
 │                        │  Enable submit button    │                       │
 │                        │  Show error message:     │                       │
 │                        │  "Invalid email or       │                       │
 │                        │   password"              │                       │
 │                        │                          │                       │
 │  Globe continues       │                          │                       │
 │  rotating              │                          │                       │
 │<───────────────────────│                          │                       │
```

### 4.3 Proxy Session Check (every request)

```
Client Request            proxy.ts                    supabase/server         Supabase Auth
  │                         │                            │                      │
  │  GET /dashboard/*       │                            │                      │
  │────────────────────────>│                            │                      │
  │                         │                            │                      │
  │                         │  Read session cookie       │                      │
  │                         │  from request headers      │                      │
  │                         │                            │                      │
  │                         │  Create Supabase SSR       │                      │
  │                         │  client with cookie        │                      │
  │                         │───────────────────────────>│                      │
  │                         │                            │                      │
  │                         │  await getUser()           │                      │
  │                         │  (lightweight, no DB hit—  │                      │
  │                         │   decodes JWT from cookie) │                      │
  │                         │<───────────────────────────│                      │
  │                         │                            │                      │
  │                         │  user exists?              │                      │
  │                         │  YES → rewrite URL,        │                      │
  │                         │         continue to page   │                      │
  │                         │  NO  → redirect /login     │                      │
  │                         │                            │                      │
  │  Dashboard page         │                            │                      │
  │<────────────────────────│                            │                      │
```

---

## 5. Component Specifications

### 5.1 `Hero.tsx` (Modified)

**Path**: `src/components/Hero.tsx`  
**Type**: Client Component (`"use client"`)  
**Purpose**: Full-screen login page with globe background and centered login form.

**Props**: None (page-level component).

**State**:
- `reducedMotion: boolean` — read from `prefers-reduced-motion` media query
- `fading: boolean` — set to `true` after successful auth, triggers globe fade-out
- `authError: string | null` — current auth error message to display

**Render**:
- Full-screen `section` with relative positioning
- `GlobeBackground` rendered as absolute inset-0, z-0
- Gradient overlay from transparent to `#05162D` at bottom (existing behavior)
- Centered content stack (z-10):
  - "World Trade Organization" label (accent-secondary `#6CA9FF`, uppercase, tracking-wider)
  - `LoginForm` component (replaces the "Coming Soon" h1 and description text)
  - Location line "Kalavakkam, Tamil Nadu" (preserved)

**Globe Fade Logic**:
- When `fading` becomes `true`, render `GlobeBackground` with `opacity` animated from 1 to 0 via Framer Motion `animate={{ opacity: 0 }}`, duration 0.8s, ease `[0.25, 0.1, 0.25, 1]`
- On `onAnimationComplete`, call `router.push("/dashboard")`
- The `LoginForm` should also fade out during this period

**Reduced Motion**: If `reducedMotion` is true, skip the globe fade-out animation entirely — redirect immediately after auth success.

### 5.2 `Globe.tsx` (Modified)

**Path**: `src/components/Globe.tsx`  
**Type**: Client Component  
**Purpose**: 3D wireframe globe as ambient background. Modified to accept external opacity control.

**New Props**:
- `className?: string` (existing)
- `opacity?: number` — controls the CSS opacity of the container div (default 1)
- `fadeSpeed?: number` — not needed; CSS handles transition timing via parent

**Changes**:
- Wrap the container `div` in a `motion.div` (or apply inline style) that accepts `opacity` from prop
- Pass the opacity to the Canvas container

**Implementation Note**: The simplest approach is to apply `style={{ opacity }}` on the outermost container div. Framer Motion in the parent (`Hero.tsx`) will animate this value. The Three.js Canvas itself does not need modification for the fade — the CSS opacity fade of the container is sufficient and GPU-efficient.

All existing functionality (rotation, city dots, connection arcs, continent outlines, ripple) remains unchanged.

### 5.3 `LoginForm.tsx` (New)

**Path**: `src/components/LoginForm.tsx`  
**Type**: Client Component (`"use client"`)  
**Purpose**: Email/password login form.

**Props**:
- `onFadeStart: () => void` — callback invoked when form is ready to begin globe fade-out
- `onError: (error: string) => void` — callback invoked on auth failure
- `reducedMotion: boolean` — forwarded from Hero

**State**:
- `email: string`
- `password: string`
- `loading: boolean`
- `error: string | null` (local copy for immediate display)

**Validation (client-side)**:
- Email: not empty, matches basic email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), max 254 chars
- Password: not empty, min 6 chars (Supabase minimum)

**Submit Handler**:
1. Client-side validation — if invalid, set local error and return
2. Set `loading = true`, clear error
3. Call `supabase.auth.signInWithPassword({ email, password })`
4. On success:
   - Call `onFadeStart()` (which triggers globe fade in parent)
5. On error:
   - Call `onError(safeErrorMessage)` with user-safe message
   - Set `loading = false`

**Error Message Mapping**:
| Supabase Error Code | Display Message |
|---|---|
| `invalid_credentials` | "Invalid email or password." |
| `email_not_confirmed` | "Please verify your email address before logging in." |
| `user_not_found` | "No account found with this email address." |
| `invalid_grant` | "Session expired. Please try again." |
| Network error | "Unable to connect. Please check your internet connection and try again." |
| All others | "An unexpected error occurred. Please try again." |

**Render**:
- `form` element with `onSubmit` handler
- Email input: type="email", autocomplete="email", required, placeholder "Email address"
- Password input: type="password", autocomplete="current-password", required, placeholder "Password"
- Submit button: accent-primary background, "Sign In" (or loading spinner when loading)
- Error display area (conditionally renders `AuthError`)
- All inputs styled per design system: bg-elevated background, border-subtle border, text-primary text, radius-sm

**Styling Notes**:
- Form container: max-w-[400px] width, centered
- Input fields: full width, padding sm (16px), border-subtle rgba(255,255,255,0.08), focus:border-strong rgba(255,255,255,0.16), focus:ring-1 focus:ring-accent-primary
- Submit button: full width, bg-accent-primary, hover:brightness-110, text-white, font-semibold, py-sm, radius-sm, disabled:opacity-50 disabled:cursor-not-allowed
- Loading spinner: 16px, border-2, border-white/30, border-t-white, rounded-full, animate-spin

### 5.4 `GlobeBackground.tsx` (New)

**Path**: `src/components/GlobeBackground.tsx`  
**Type**: Client Component (`"use client"`)  
**Purpose**: Thin wrapper that renders Globe as full-screen ambient background with gradient overlay.

**Props**:
- `opacity?: number`

**Render**:
```
<div className="absolute inset-0 z-0" style={{ opacity }}>
  <Globe />
</div>
<div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-[#05162D] pointer-events-none" />
```

### 5.5 `AuthError.tsx` (New)

**Path**: `src/components/AuthError.tsx`  
**Type**: Client Component  
**Purpose**: Animated error banner for auth failures.

**Props**:
- `message: string`

**Render**:
- Framer Motion `motion.div` with `initial={{ opacity: 0, y: -8 }}`, `animate={{ opacity: 1, y: 0 }}`, exit animation on unmount
- Styling: padding-xs sm, bg-red-900/20 (or equivalent dark red), border-1 border-red-500/30, radius-sm, text-sm text-red-300
- Icon: simple exclamation triangle or `!` symbol in red

### 5.6 `DashboardSidebar.tsx` (New)

**Path**: `src/components/DashboardSidebar.tsx`  
**Type**: Client Component  
**Purpose**: Left sidebar navigation for authenticated area.

**Props**:
- `user: User` — the current user object (from supabase)
- `onLogout: () => void` — logout handler

**Render**:
- Fixed left sidebar, w-[240px] desktop, w-full bottom sheet mobile
- Top section: WTO logo/wordmark, "World Trade Organization" subtitle
- Divider (border-subtle)
- Navigation items:
  - "Home" → `/dashboard` (active state)
  - "Disputes" → `/dashboard/disputes` (future)
  - "Evidence" → `/dashboard/evidence` (future)
  - "Reports" → `/dashboard/reports` (future)
- Spacer (flex-grow)
- User info section: email, role badge
- "Sign Out" button

**Navigation Items**: Each rendered as a `Link` from `next/navigation`. Active state determined via `usePathname()`. Active item gets accent-primary left border and slightly brighter text.

**Responsive**:
- Desktop: fixed sidebar, main content offset by 240px
- Tablet/Mobile: sidebar collapses to top bar hamburger menu or bottom tab navigation. Exact responsive behavior specified in detail below.

**Role Badge**: Pill-shaped label, bg-accent-primary/20, text-accent-secondary, text-xs, uppercase. Displays "Executive Board" or "Delegate" based on `user.user_metadata.role`.

### 5.7 `DashboardHeader.tsx` (New)

**Path**: `src/components/DashboardHeader.tsx`  
**Type**: Client Component  
**Purpose**: Top bar showing current page title and user menu.

**Props**:
- `title: string` — current page title
- `user: User`
- `onLogout: () => void`

**Render**:
- Full-width top bar, h-[56px], border-b border-subtle
- Left: page title (Sora, font-semibold, text-lg)
- Right: user email (text-sm text-muted) + logout button (text-xs text-muted hover:text-secondary)

### 5.8 `DashboardLayout` (`/dashboard/layout.tsx`)

**Path**: `src/app/dashboard/layout.tsx`  
**Type**: Server Component (can be async, fetches user)  
**Purpose**: Authenticated layout for all `/dashboard/*` routes.

**Behavior**:
- Uses `createServerClient` from `@supabase/ssr` to get user
- If no user: use `redirect("/")` from `next/navigation`
- Passes user data to sidebar and header
- Renders sidebar + header + main content area

**Layout Structure**:
```
<div class="min-h-screen bg-bg-primary flex">
  <DashboardSidebar user={user} onLogout={...} />
  <div class="flex-1 flex flex-col ml-[240px]">
    <DashboardHeader user={user} onLogout={...} />
    <main class="flex-1 p-lg overflow-y-auto">
      {children}
    </main>
  </div>
</div>
```

**Important**: The `onLogout` callback for sidebar and header should call a server action or route handler that invokes `supabase.auth.signOut()`. This can be handled via a `<form>` with `action` pointing to `/auth/signout` route handler, or via a client-side redirect. The recommended approach is a client component that calls `createBrowserClient().auth.signOut()` then redirects.

### 5.9 Sign-Out Route Handler (`/auth/signout/route.ts`)

**Path**: `src/app/auth/signout/route.ts`  
**Type**: Server Route Handler  
**Purpose**: Clear the auth session and redirect to login.

**Behavior**:
1. Create a Supabase SSR server client
2. Call `await supabase.auth.signOut()`
3. Redirect to `/` (login page) with 303

```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.signOut();
  redirect("/");
}
```

### 5.10 `DashboardPage` (`/dashboard/page.tsx`)

**Path**: `src/app/dashboard/page.tsx`  
**Type**: Server Component  
**Purpose**: Welcome page with placeholder stats.

**Render**:
- "Welcome, [user email]" heading
- Stats grid (placeholder, 4 cards):
  - "Active Disputes" — count placeholder (hardcoded 0 for now)
  - "Pending Reviews" — count placeholder
  - "Completed Reports" — count placeholder
  - "Notifications" — count placeholder
- Each card: bg-elevated, border-subtle border, radius-md, padding-md
- Card content: stat number (text-3xl font-bold), label (text-sm text-muted)

**Data Source**: Currently hardcoded. In Phase 1, these will be fetched from Supabase.

---

## 6. Proxy / Middleware Logic

### 6.1 File Location

`src/proxy.ts` — Next.js 16 file convention. This replaces the `middleware.ts` convention from Next.js ≤15.

### 6.2 Export

```typescript
export function proxy(request: NextRequest) {
  // ... implementation
}
```

The export name must be `proxy`, not `middleware`.

### 6.3 Configuration

```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 6.4 Logic

```
1. Parse request URL
2. Create cookie store from request headers
3. Create Supabase SSR client with cookie store
4. Call await supabase.auth.getUser()
   - This decodes the JWT from the cookie without a database call
   - Returns { data: { user } } or { data: { user: null } }
5. Determine if user is authenticated: user !== null
6. Apply route rules:
   a. If NOT authenticated AND path starts with /dashboard:
      → Redirect to / (login page)
   b. If IS authenticated AND path is / or /login:
      → Redirect to /dashboard
   c. Otherwise:
      → Continue (rewrite/NextResponse.next())
```

### 6.5 Implementation

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Authenticated user on login page → redirect to dashboard
  if (user && (pathname === "/" || pathname.startsWith("/login"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Unauthenticated user on protected route → redirect to login
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Why `getUser()` instead of `getSession()`**: `getUser()` verifies the JWT signature with the Supabase Auth server, making it more secure than `getSession()` which only reads the cookie without verification. For cookie-based optimistic checks in middleware, `getUser()` is the recommended approach from Supabase SSR docs. The overhead is negligible since no database query is involved — only JWT decoding.

### 6.6 No Role-Based Checks in Proxy

The proxy checks only for the existence of a valid session. Role-based access control (e.g., restricting certain dashboard sections to `executive_board` only) will be implemented in later phases at the page component level, not in the proxy. This keeps the proxy fast and focused on its single responsibility: auth gate.

---

## 7. Supabase Client Setup

### 7.1 Browser Client (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Used in all client components that need to interact with Supabase (login form, logout, etc.).

### 7.2 Server Client (`src/lib/supabase/server.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

Used in Server Components, Route Handlers, and Server Actions. Because `cookies()` must be awaited in Next.js 16, this function is async.

### 7.3 Supabase Database Setup (Auth Schema)

The following SQL must be run in the Supabase SQL Editor to create the user profile table with RBAC support:

```sql
-- Create user_profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('executive_board', 'delegate')),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Only executive_board can read all profiles (for future admin features)
CREATE POLICY "Executive board can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'executive_board'
    )
  );

-- Create a trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'delegate'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

This setup ensures that every new Supabase Auth user automatically gets a profile with a role. Users cannot change their own role; only the database administrator can update roles directly.

### 7.4 User Metadata During Signup

When creating users (via Supabase Dashboard or Admin API), include:

```json
{
  "role": "executive_board",
  "display_name": "John Smith"
}
```

---

## 8. Error Handling Strategy

### 8.1 Auth Errors

| Scenario | Handling | User-Facing Message |
|----------|----------|-------------------|
| Invalid email/password | Catch `AuthApiError` with code `invalid_credentials` | "Invalid email or password." |
| Unconfirmed email | Catch error code `email_not_confirmed` | "Please verify your email address before logging in." |
| Empty email or password | Client-side validation before API call | "Please enter your email address." / "Please enter your password." |
| Network error | Catch fetch failure | "Unable to connect. Please check your internet connection and try again." |
| Rate limited (too many attempts) | Catch `AuthRetryableError` or 429 | "Too many login attempts. Please try again later." |
| Unknown server error | Generic catch-all | "An unexpected error occurred. Please try again." |

### 8.2 Session Errors

| Scenario | Handling |
|----------|----------|
| Expired session | Proxy redirects to `/` (login). After login, Supabase refreshes the token automatically if `refreshInterval` is configured. |
| Missing cookies | Proxy treats as unauthenticated → redirect to `/`. |
| Corrupted cookie | Proxy `getUser()` returns null → redirect to `/`. User logs in again to get fresh cookies. |

### 8.3 Network Failure in Proxy

If the proxy's `getUser()` call fails due to network error, the proxy should treat the user as unauthenticated (fail-closed for protected routes, fail-open for public routes). This prevents users from being locked out entirely if Supabase is unreachable.

```typescript
let user = null;
try {
  const { data } = await supabase.auth.getUser();
  user = data.user;
} catch {
  // Supabase unreachable — treat as unauthenticated
  // Protected routes will redirect to login
  // Login page will show network error if user tries to sign in
}
```

### 8.4 Logging

Auth errors should be logged server-side (via `console.error` or a logging service) with:
- Timestamp
- Error code/message
- Request path
- IP (if available, from `x-forwarded-for` header)

Client-side error messages must never expose internal details (no stack traces, no Supabase error codes in user-facing text).

---

## 9. Loading States

### 9.1 Login Form

| State | UI |
|-------|-----|
| Idle (initial) | Empty email and password fields. "Sign In" button enabled. |
| Validating (client) | Same as idle — validation is synchronous and instant. |
| Submitting | All inputs disabled (`disabled` attribute). Submit button shows a loading spinner (16px circle border animation). Button text becomes "Signing in..." (sr-only for accessibility). Button is `cursor-not-allowed`. |
| Success | Button shows checkmark briefly (300ms). Then globe fade-out begins. During fade-out (800ms), form remains visible but non-interactive. |
| Error | Button re-enables. Inputs re-enable. Error banner appears above the form with animation. Email field retains the entered email; password field is cleared for security. |
| Network Retry | Same as error state — user can click "Sign In" again immediately. |

### 9.2 Globe Fade-Out

| State | Globe Opacity | Duration | Easing |
|-------|--------------|----------|--------|
| Normal | 1 | — | — |
| Fading | 1 → 0 | 800ms | `[0.25, 0.1, 0.25, 1]` |
| Redirect | 0 (after complete) | redirect immediately | — |

### 9.3 Dashboard Loading

Server Components handle their own loading via Next.js `loading.tsx` convention:

**`/dashboard/loading.tsx`**:
- Full-screen `div` with centered spinner
- WTO-branded spinner (16px, border-accent-primary, animate-spin)
- "Loading..." text in text-muted

The proxy check is synchronous at the request level — users never see a loading state for the auth gate. Either they have a valid cookie and the page renders, or they get a 302 redirect before any page content starts loading.

### 9.4 Initial Page Load (First Visit)

When a user visits `/` for the first time:
1. Globe renders (no loading needed — it's the background)
2. Form inputs are empty
3. No loading indicator on the form

The proxy previously ran and determined the user has no session, so the page renders immediately without redirect.

---

## 10. Edge Cases

### 10.1 Network Failure During Login

If the Supabase API is unreachable when the user clicks "Sign In":
- The `signInWithPassword` promise rejects with a network error
- The form shows the network error banner
- The user can retry
- Globe continues rotating (never fades)

### 10.2 Network Failure During Proxy Auth Check

If the proxy's `getUser()` call fails:
- For `/dashboard/*` requests: fail-closed. Redirect to `/` (login). User sees the login page. If they try to log in and Supabase is down, the login form handles the error as above.
- For `/` requests: fail-open. Allow rendering the login page. This is safe because even if we incorrectly think a user is unauthenticated, they simply see the login page again — no harm.

### 10.3 Session Expires Mid-Session

User is viewing `/dashboard`, and their session cookie expires:
- Next navigation or page refresh triggers the proxy
- Proxy sees no valid user → redirect to `/` (login)
- User sees the login page with the globe
- No error message is shown — this is a silent redirect

### 10.4 Multiple Tabs

- User logs in on Tab A → cookies are set
- Tab B (still on login page) refreshes → proxy detects session → redirects to `/dashboard`
- User logs out on Tab A → cookies cleared
- Tab B refreshes → proxy sees no session → redirects to `/`

No special handling needed. The cookie-based approach handles this naturally.

### 10.5 Back Button After Logout

- User logs out via the sign-out button
- Browser navigates to `/`
- If the user presses the browser back button, they see the previous page (dashboard)
- On next click/refresh, the proxy runs and redirects to `/`
- This is acceptable browser behavior; no special handling needed

### 10.6 Rapid Form Submission

If the user double-clicks "Sign In":
- First click: sets `loading = true`, disables button
- Second click: button is disabled, no effect
- Only one auth request is sent

### 10.7 Role Enforcement on Profile

- If a user is created without a `role` metadata value, the database trigger defaults to `'delegate'`
- The proxy does not check roles
- Dashboard components can check `user.user_metadata.role` or query `user_profiles` table for role-based UI

### 10.8 Globe Scroll Parallax on Login Page

The current `Hero` component uses `useScroll` and `useTransform` for parallax effects. On the login page:
- Parallax is preserved but reduced — the globe should not scroll (the login page is a single viewport with no scroll)
- Remove or disable the scroll-based transforms for the login page version
- The globe should remain fixed and only rotate in-place (y-axis rotation from `useFrame`)

### 10.9 Reduced Motion Preference

When `prefers-reduced-motion: reduce`:
- Globe rotates very slowly or not at all (speed reduced by 90%)
- Globe fade-out on auth success is instant (no 800ms animation)
- All Framer Motion animations use `initial` equals `animate` values (static render)

### 10.10 Empty State — No Users in System

- If no user accounts exist in Supabase Auth, the login form works normally — it simply rejects all credentials
- The error message "Invalid email or password" is appropriate
- The system requires at least one user (created via Supabase Dashboard) before any login is possible

---

## 11. Acceptance Criteria

### 11.1 Login Page

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-01 | The page at `/` displays the 3D wireframe globe as a full-screen background | Visual inspection |
| AC-02 | The WTO label and Kalavakkam location line are visible on the page | Visual inspection |
| AC-03 | A centered login form is displayed over the globe with email and password inputs | Visual inspection |
| AC-04 | The form has proper labels and placeholder text | Visual inspection |
| AC-05 | The globe rotates slowly on the y-axis | Visual inspection |
| AC-06 | Clicking the globe triggers the ripple effect (existing behavior preserved) | Visual inspection |
| AC-07 | The form is keyboard-accessible — Tab, Enter, and Escape work correctly | Manual testing |

### 11.2 Authentication Flow

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-08 | Submitting valid email/password calls `supabase.auth.signInWithPassword` | Console/network tab inspection |
| AC-09 | On successful auth, the globe fades out over ~800ms | Visual inspection + timing measurement |
| AC-10 | After globe fade completes, the browser navigates to `/dashboard` | Visual inspection |
| AC-11 | On failed auth, an error message appears above the form | Visual inspection |
| AC-12 | On failed auth, the globe continues rotating (no fade) | Visual inspection |
| AC-13 | The form shows a loading spinner while the auth request is in flight | Visual inspection |
| AC-14 | The submit button is disabled during loading | Visual inspection |
| AC-15 | The password field is cleared on error | Manual testing |
| AC-16 | Empty email or password shows client-side validation before any API call | Manual testing |
| AC-17 | Network errors show a user-friendly message | Simulate offline |

### 11.3 Route Protection

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-18 | Unauthenticated user navigating to `/dashboard` is redirected to `/` | Manual testing |
| AC-19 | Unauthenticated user navigating to `/dashboard/disputes` is redirected to `/` | Manual testing |
| AC-20 | Authenticated user navigating to `/` is redirected to `/dashboard` | Manual testing |
| AC-21 | Authenticated user navigating to `/login` is redirected to `/dashboard` | Manual testing |
| AC-22 | Static assets (images, etc.) are not blocked by proxy | Manual testing |

### 11.4 Dashboard Shell

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-23 | The dashboard page at `/dashboard` loads after login | Manual testing |
| AC-24 | The sidebar displays the WTO branding and navigation items | Visual inspection |
| AC-25 | The sidebar shows the user's role as a badge | Visual inspection |
| AC-26 | Clicking "Home" navigates to `/dashboard` | Manual testing |
| AC-27 | Clicking "Disputes" navigates to `/dashboard/disputes` | Manual testing |
| AC-28 | The dashboard shows "Welcome" and 4 stat placeholder cards | Visual inspection |
| AC-29 | The sign-out button triggers a session clear and redirect to `/` | Manual testing |

### 11.5 Session Management

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-30 | After login, refreshing the page keeps the user on `/dashboard` | Manual testing |
| AC-31 | After closing and reopening the browser, the session persists | Manual testing |
| AC-32 | After clicking "Sign Out", the session is cleared | Manual testing |
| AC-33 | After sign out, the user cannot navigate to `/dashboard` without logging in again | Manual testing |

### 11.6 Responsive Design

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-34 | The login page renders correctly at 1440px, 1024px, 768px, and 375px widths | Visual inspection |
| AC-35 | The login form is centered and readable on mobile (<640px) | Visual inspection |
| AC-36 | The dashboard sidebar collapses or adapts on mobile | Visual inspection |
| AC-37 | The dashboard layout is usable on tablet and mobile | Manual testing |

### 11.7 Accessibility

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-38 | All form inputs have associated labels | Code review |
| AC-39 | Focus states are visible on all interactive elements | Visual inspection |
| AC-40 | Error messages are announced by screen readers (use `aria-live="polite"`) | Manual testing |
| AC-41 | The globe fades respect `prefers-reduced-motion: reduce` | Manual testing |
| AC-42 | Color contrast ratios meet WCAG AA (4.5:1 minimum) | Color contrast checker |
| AC-43 | The login form can be completed using keyboard only | Manual testing |

### 11.8 Performance

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-44 | The login page loads within 3 seconds on a standard broadband connection | Lighthouse |
| AC-45 | The dashboard page loads within 2 seconds (no globe) | Lighthouse |
| AC-46 | No unnecessary re-renders during globe rotation | React DevTools profiler |
| AC-47 | Proxy response time is under 100ms (not counting Supabase JWT decode) | Manual measurement |

---

## Appendix A: Supabase Project Setup

### A.1 Creating the Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Copy the project URL and anon key to `.env.local`
3. Enable email/password auth in Authentication → Providers → Email
4. Disable "Confirm email" for development (or keep enabled for production)
5. Run the SQL from Section 7.3 in the SQL Editor

### A.2 Creating Initial Users

Users can be created via:
- Supabase Dashboard → Authentication → Users → Add User
- Supabase Management API
- Custom signup page (future phase)

Include `role` in the user metadata when creating users:
```json
{"role": "executive_board", "display_name": "Chairperson Name"}
```

---

## Appendix B: Testing Strategy

### B.1 Unit Tests

- `LoginForm`: test validation, error states, loading state, submit handler
- `AuthError`: test render with various message lengths
- `DashboardSidebar`: test active link highlighting, role badge display

### B.2 Integration Tests

- Login flow: fill form → submit → verify redirect
- Failed login: fill form → submit → verify error message
- Proxy: mock getUser → test redirect rules
- Logout: click sign out → verify redirect and cookie clearance

### B.3 E2E Tests

- Full login flow with real Supabase project
- Session persistence across page reloads
- Protected route access with and without valid session
- Mobile responsive behavior

---

## Appendix C: Migration from Current State

### C.1 Files to Modify

| File | Change |
|------|--------|
| `src/components/Hero.tsx` | Replace "Coming Soon" text with `LoginForm` component. Add fade-out state management. |
| `src/components/Globe.tsx` | Accept `opacity` prop for fade-out support. |
| `src/app/page.tsx` | Minor — ensure Hero still renders without Footer (or conditionally hide Footer on login). Footer should be removed from the login page since it's a full-screen experience. |

### C.2 Files to Create

| File | Purpose |
|------|---------|
| `src/proxy.ts` | Route protection |
| `src/components/LoginForm.tsx` | Login form |
| `src/components/GlobeBackground.tsx` | Globe wrapper |
| `src/components/AuthError.tsx` | Error banner |
| `src/components/DashboardSidebar.tsx` | Sidebar |
| `src/components/DashboardHeader.tsx` | Header |
| `src/app/dashboard/layout.tsx` | Dashboard layout |
| `src/app/dashboard/page.tsx` | Dashboard home |
| `src/app/dashboard/loading.tsx` | Loading state |
| `src/app/dashboard/disputes/page.tsx` | Placeholder |
| `src/app/auth/signout/route.ts` | Sign-out handler |
| `src/lib/supabase/client.ts` | Browser supabase client |
| `src/lib/supabase/server.ts` | Server supabase client |

### C.3 Files to Remove

None. The "Coming Soon" content is replaced, not removed. The original text can be referenced in git history.

---

*End of Phase 0 SRS Document*
