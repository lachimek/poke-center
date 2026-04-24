<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PokeCentering — agent context

Use this document as the default context when working in this repo. Keep changes aligned with the conventions below unless the user explicitly asks otherwise.

## 1. Project snapshot

PokeCentering is a browser-first tool for measuring the centering of Pokémon / TCG cards. Three surfaces share a single codebase:

- **Desktop analyzer** (`/`) — upload front/back, run perspective correction, drag guides, read centering / grade summary, export a composite PNG.
- **Mobile capture** (`/protected/capture`) — phone camera → re-encoded JPEG → upload as a work-in-progress (WIP) card.
- **WIP → desktop handoff** (`/protected/wip`) — open a captured card back on desktop via `/?wip={id}` to finish centering and save to account.

Tech stack:

- Next.js 16 (App Router, React 19, React Compiler enabled — see [next.config.ts](next.config.ts))
- TypeScript strict, path alias `@/*` → `src/*` ([tsconfig.json](tsconfig.json))
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Biome 2 — single formatter + linter ([biome.json](biome.json))
- NextAuth (Credentials provider, JWT sessions) + `bcryptjs`
- Drizzle ORM on Postgres (`postgres` driver)
- Cloudflare R2 via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- Zustand for client state, IndexedDB for local session persistence, `react-toastify` for notifications, `lucide-react` for icons

## 2. Repo layout

```
src/
  app/                      Next.js App Router (pages + API)
    (protected)/protected/  Auth-gated routes: cards, wip, capture, test
    api/                    Route handlers (auth, cards, uploads, wip-cards)
  actions/                  Server Actions (e.g. register)
  components/
    auth/                   LoginModal, RegisterModal
    capture/                Mobile capture UI
    centering/              Desktop analyzer (viewer, guides, perspective, modals)
    ui/                     Reusable primitives (ModalShell, HoverTooltip, AppToaster, SignOutButton)
    wip/                    WIP list rows
  hooks/                    Reusable hooks (capture, perspective, viewer transform, etc.)
  lib/
    auth/                   NextAuth options + getSession helper
    capture/                Client-side capture pipeline (re-encode, WIP submit)
    centering/              Pure-logic modules: math, perspective warp, export, session schemas
    db/                     Drizzle client + schema
    storage/                R2 client, image service, WIP cascade service
    toast.ts                notifyX wrappers
  providers/                Client providers (AuthProvider wraps SessionProvider)
  stores/                   Zustand stores (centeringStore)
  types/                    Ambient type augmentation (next-auth)
  proxy.ts                  Next.js middleware (exported as `proxy`, matcher `/protected/:path*`)
drizzle/                    Generated migrations (do not hand-edit)
```

Note the `(protected)` route group — it's a grouping segment, not part of the URL. Actual URLs start at `/protected/...`. The middleware in [src/proxy.ts](src/proxy.ts) redirects unauthenticated users to `/`.

## 3. Coding conventions

- **Functional React + TypeScript only.** No class components. Prefer named exports; default exports only for `page.tsx` / `layout.tsx` / `route.ts` / middleware.
- **Server Components by default.** Add `"use client"` only when the file needs interactivity (state, effects, event handlers, Zustand, `useSession`). See server-rendered [src/app/(protected)/protected/cards/page.tsx](src/app/(protected)/protected/cards/page.tsx) vs. client [src/components/centering/CenteringApp.tsx](src/components/centering/CenteringApp.tsx).
- **Validation without Zod.** We hand-roll `isX(value: unknown): value is X` predicates and narrow before use. Every API route follows this pattern, and client-side payloads too — see [src/lib/centering/sessionPayload.ts](src/lib/centering/sessionPayload.ts) and [src/app/api/cards/finalize/route.ts](src/app/api/cards/finalize/route.ts). Don't reach for Zod.
- **Types.** Avoid `any`; prefer `unknown` + narrowing. Export `type`/`interface` from the module that owns the concept. Use Drizzle's `InferInsertModel` / `InferSelectModel` for row types (see [src/lib/centering/savedCardMapper.ts](src/lib/centering/savedCardMapper.ts)).
- **Formatting.** 2-space indent, double quotes, trailing commas. Imports are auto-organized by Biome. Run `yarn lint` (check) or `yarn lint:fix` (auto-fix). Husky + lint-staged run `biome check --write` on staged files.
- **Comments.** Only for non-obvious intent, trade-offs, or constraints. No narration of what the code does.

## 4. Styling conventions (Tailwind v4)

Dark theme only. Don't introduce a light mode without a prompt.

- Surfaces: page `bg-zinc-950`, panels/cards `bg-zinc-900/70` with `border-zinc-800`, nested surfaces `bg-zinc-950/70`.
- Text: body `text-zinc-100`, secondary `text-zinc-400`, labels `text-zinc-500`, disabled `opacity-50`.
- Accents: primary/emerald `emerald-500/*` (save, confirm, active). Info/sky `sky-500/*` (save-to-account, WIP banner). Destructive `red-500/*`. Stick to these families.
- Radii: `rounded-3xl` for section panels, `rounded-2xl` for buttons/inputs/toolbar chips, `rounded-xl` for thumbnails/small chips.
- Buttons: reuse the canonical `btnBase` exported from [src/components/ui/ModalShell.tsx](src/components/ui/ModalShell.tsx):
  `"rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40"`.
  Compose variant classes after it.
- Small eyebrow labels: `text-[11px] uppercase tracking-[0.22em] text-zinc-500`.
- Numeric displays: `tabular-nums`.
- Fonts: Geist (sans + mono) loaded via `next/font` in [src/app/layout.tsx](src/app/layout.tsx).
- Global CSS is reserved for third-party overrides (toast skin in [src/app/globals.css](src/app/globals.css)). Don't add feature styles there — use Tailwind utilities in components.

## 5. Auth

- Provider: NextAuth Credentials + JWT. See [src/lib/auth/auth.ts](src/lib/auth/auth.ts). Passwords hashed with `bcryptjs` (`hash(pw, 12)`).
- Server: `await getSession()` (re-exported from [src/lib/auth/index.ts](src/lib/auth/index.ts)). Client: `useSession()` from `next-auth/react`.
- Session type is augmented in [src/types/next-auth.d.ts](src/types/next-auth.d.ts) so `session.user.id` is a `string`.
- The `AuthProvider` in [src/providers/Auth.tsx](src/providers/Auth.tsx) wraps the tree and is given the server session in [src/app/layout.tsx](src/app/layout.tsx).
- **Route protection:** two layers.
  1. Middleware [src/proxy.ts](src/proxy.ts) (matcher `/protected/:path*`) checks the session cookie and redirects to `/` if missing. Note: the middleware is exported as `proxy`, not `middleware`.
  2. Protected server pages also call `redirect("/")` when `session?.user?.id` is absent. Keep both — defense in depth.
- Registration is a Server Action in [src/actions/auth.ts](src/actions/auth.ts) consumed via `useActionState` in [src/components/auth/RegisterModal.tsx](src/components/auth/RegisterModal.tsx). Login goes through `signIn("credentials", { redirect: false })` in [src/components/auth/LoginModal.tsx](src/components/auth/LoginModal.tsx) followed by `router.refresh()`.

## 6. API routes (`src/app/api/**/route.ts`)

Every route follows the same recipe. Use this as a template:

```ts
export async function POST(req: Request) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "You must be signed in." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = getFooPayload(body); // isX-style narrowing
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }

  // per-field checks (length, ownership, mime, size) — return 400 with a human error

  try {
    // DB / R2 work
    return NextResponse.json({ ok: true /* ... */ });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not ..." },
      { status: 500 },
    );
  }
}
```

Rules:

- Response envelope is always `{ ok: true, ... }` or `{ ok: false, error: string }`. Pick the right status: `401` unauthenticated, `400` validation, `404` not found, `422` upstream rejected input, `500` internal, `502` upstream failed.
- Always scope DB reads/writes by `userId`: `and(eq(table.id, id), eq(table.userId, userId))`.
- For anything referencing an R2 `objectKey` supplied by the client, verify ownership with `objectKey.startsWith(\`users/${userId}/cards/\`)` (see finalize routes).
- Dynamic segment params are async: `type RouteContext = { params: Promise<{ id: string }> }` and `const { id } = await ctx.params` (see [src/app/api/wip-cards/[id]/route.ts](src/app/api/wip-cards/[id]/route.ts)). This is a Next.js 16 thing — don't regress it.
- UUIDs from the client must match the repo's regex before hitting the DB:
  `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`.
- Route file only contains the HTTP surface. Push DB/R2 logic into `src/lib/...` services (e.g. `imageService`, `wipCardService`, `savedCardMapper`).

## 7. Database (Drizzle + Postgres)

- Schema lives in [src/lib/db/schema.ts](src/lib/db/schema.ts). Tables:
  - `users` — email + bcrypt hash.
  - `images` — every R2 object has a row here, indexed by `userId`.
  - `savedCards` — finalized centering result with `jsonb` `configuration` typed `$type<CenteringSessionConfiguration>()`.
  - `wipCards` — captured-on-mobile cards awaiting centering.
- Deletion semantics: user-owned rows use `onDelete: "cascade"`. Image FKs on `savedCards`/`wipCards` use `onDelete: "set null"` so the row survives an image row getting cleaned up.
- DB client: `import { db } from "@/lib/db"` ([src/lib/db/index.ts](src/lib/db/index.ts)). Don't instantiate a second `postgres()` connection anywhere.
- Aliasing for self-joins (e.g. joining `images` twice for front + back): `alias(images, "front_raw_image")`. See [src/app/(protected)/protected/cards/page.tsx](src/app/(protected)/protected/cards/page.tsx).
- Migrations are generated with `drizzle-kit` into `drizzle/` and auto-applied by the Vercel `build` script (see [package.json](package.json)). **Never hand-edit generated SQL** — add a new migration instead.
- Drizzle config: [drizzle.config.ts](drizzle.config.ts) (dialect `postgresql`, schema path, output `./drizzle`).

## 8. Storage (R2) & image upload flow

All card images live in Cloudflare R2 (private bucket). Uploads use a **two-step direct upload** to avoid hitting serverless body-size limits (production `413`):

1. Client `POST /api/uploads/create` (or `/api/wip-cards/create`) with `[{ purpose, mimeType, byteSize }]`. Server returns presigned `PUT` URLs + `objectKey`s.
2. Client `PUT`s each blob directly to R2 with the matching `Content-Type`.
3. Client `POST /api/cards/finalize` (or `/api/wip-cards/finalize`) with the `objectKey`s and any associated payload (card name + `configuration` for saved cards).

Reference implementations:

- Server: [src/lib/storage/r2.ts](src/lib/storage/r2.ts) (`signUploadUrl`, `signObjectUrl`, `uploadImageBuffer`, `deleteObject`), [src/lib/storage/imageService.ts](src/lib/storage/imageService.ts) (`createPresignedUpload`, `validateUploadRequest`, `persistUploadedImages`, `REQUIRED_UPLOAD_PURPOSES`).
- Client: [src/lib/capture/wipCardClient.ts](src/lib/capture/wipCardClient.ts) (mobile three-step submit with typed `WipSubmitError { step }`), [src/components/centering/SaveCardToAccountModal.tsx](src/components/centering/SaveCardToAccountModal.tsx) (desktop four-variant submit).

Conventions:

- Object-key convention: `users/{userId}/cards/{purpose}/{uuid}.{ext}` — generated by `toObjectKey`. Never construct keys any other way.
- Allowed MIME: `image/png`, `image/jpeg`, `image/webp`. Max 10 MB per image (`MAX_IMAGE_BYTES`).
- Required purposes: **saved card** → `front_raw`, `front_processed`, `back_raw`, `back_processed`. **WIP card** → `front_raw`, `back_raw`.
- Frontend reads: private bucket means the browser must use short-lived signed GETs. Generate them on the server with `signObjectUrl(objectKey)` (15-minute default) and pass the signed URL to the client.
- Cascading delete: always go through a service like `deleteWipCardCascade` in [src/lib/storage/wipCardService.ts](src/lib/storage/wipCardService.ts). DB rows are removed unconditionally; R2 deletes are best-effort and logged on failure.

## 9. Client data / state

- **Global client state: Zustand.** One store per feature, e.g. [src/stores/centeringStore.ts](src/stores/centeringStore.ts). Expose selectors via `useCenteringStore((s) => s.front)` — never destructure the whole store. For imperative reads outside render (e.g. inside a submit handler), use `useCenteringStore.getState()`.
- **Local-device persistence: IndexedDB.** Large payloads like data-URL images cannot go in `localStorage`. Use the helper pattern in [src/lib/centering/sessionDb.ts](src/lib/centering/sessionDb.ts) (promisified `IDBRequest`, versioned schema). Validate on load with an `isSessionPayload` predicate.
- **HTTP from the client:** plain `fetch`. Type the JSON as a discriminated union:

  ```ts
  type FinalizeResponse = { ok: true } | { ok: false; error: string };
  const json = (await res.json()) as FinalizeResponse;
  if (!res.ok || !json.ok) {
    notifyError(json.ok ? "Fallback" : json.error || "Fallback");
    return;
  }
  ```
- **Effect cleanup:** cancel on unmount with a `let cancelled = false` flag; revoke object URLs in the same effect's cleanup (see [src/hooks/useCapturedSides.ts](src/hooks/useCapturedSides.ts)).

## 10. UX primitives

- **Toasts.** Always go through [src/lib/toast.ts](src/lib/toast.ts): `notifySuccess`, `notifyInfo`, `notifyWarning`, `notifyError`. Never call `toast()` from `react-toastify` directly. `AppToaster` is mounted once in the root layout — do not mount another.
- **Modals.** Use [`ModalShell`](src/components/ui/ModalShell.tsx) from `src/components/ui/ModalShell.tsx` — it handles portal, ESC-to-close, body scroll lock, `aria-modal`, labelled title. Pass `footer` separately; set `dialogClassName` for sizing (e.g. `max-w-sm`, `max-w-md`, `max-w-5xl`).
- **Tooltips.** Use [`HoverTooltip`](src/components/ui/HoverTooltip.tsx) for short, hover-triggered hints.
- **Icons.** `lucide-react` only.
- **Images.** Prefer `next/image` for static assets. For local `ObjectURL` previews and signed R2 URLs we use plain `<img>` with a `// biome-ignore lint/performance/noImgElement: <reason>` comment — match that pattern when you need the same.
- **Forms.** Inputs share this skin: `rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2`.

## 11. Feature flows (quick reference)

- **Sign-in:** `LoginModal` → `signIn("credentials", { redirect: false })` → on success `notifySuccess` + `onClose()` + `router.refresh()`.
- **Register:** `RegisterModal` uses `useActionState(register, initialState)`; on `state.success` it switches to login.
- **Centering (desktop):**
  1. Upload per side → `usePerspectiveSession` opens `PerspectiveModal` automatically after upload.
  2. Optional auto-detect corners: `POST /api/cards/detect-corners` (multipart; proxies to `CARD_DETECTOR_URL` with a 15 s abort).
  3. Confirm quad → `warpToCardSize` produces a rectified PNG data URL; guides are reset.
  4. Drag guides → `computeSideResult` + `summarizeCenteringByCompany` drive the `SummaryPanel`.
  5. "Save session" → IndexedDB via `saveCenteringSession` (local only). "Save to account" → two-step R2 upload + `POST /api/cards/finalize` (four variants). "Export" → `renderCenteringExportPng` → preview modal with download.
- **Mobile capture:**
  1. `useCapturedSides` handles per-side file pick; `reencodeImage` ([src/lib/capture/reencodeImage.ts](src/lib/capture/reencodeImage.ts)) strips EXIF and clamps to 2048 px long edge, JPEG quality 0.9.
  2. `useWipCardSubmit` → `submitWipCard` runs the three-step flow (`create` → `upload-front` → `upload-back` → `finalize`). Surface errors via the `WipSubmitError.step` field (CORS hints for `upload-*`, server messages for `create`/`finalize`).
  3. On success redirect to `/protected/wip`.
- **WIP → desktop:** list at `/protected/wip`; "Open in analyzer" navigates to `/?wip={id}`; `CenteringApp` reads the `wip` query param, fetches `/api/wip-cards/{id}`, downloads the raw images as data URLs, hydrates the Zustand store, and auto-opens perspective on the front side. Saving to account cascade-deletes the WIP row + its R2 objects server-side.

## 12. Environment variables

Defined in `.env` (see [.env.example](.env.example) / [README.md](README.md)):

- `DATABASE_URL` — Postgres connection string.
- `AUTH_SECRET`, `BETTER_AUTH_SECRET`, `NEXTAUTH_URL` — NextAuth.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` — Cloudflare R2 bucket credentials.
- `CARD_DETECTOR_URL` — external service for auto-detecting card corners (e.g. `http://localhost:8787`). Proxied by [src/app/api/cards/detect-corners/route.ts](src/app/api/cards/detect-corners/route.ts).

Never log or echo secrets. Don't commit `.env`.

## 13. Scripts

- `yarn dev` — Next dev server.
- `yarn build` — runs `drizzle-kit migrate` first when `VERCEL_ENV` is `production` or `preview`, then `next build`. Don't add another migration entry point.
- `yarn lint` / `yarn lint:fix` — Biome check (no fix / with fix).
- `yarn format` — Biome formatter.
- `yarn prepare` — Husky install (lint-staged runs `biome check --write` on commit).

## 14. Do / Don't checklist

Do:

- Prefer Server Components; only opt into `"use client"` when interactivity is required.
- Scope every DB query by `userId`.
- Validate every request body with an `isX(unknown): value is X` predicate before use.
- Return `{ ok, error?, ... }` JSON with the right HTTP status from API routes.
- Use `notifySuccess/Info/Warning/Error` for all user-visible feedback.
- Use `ModalShell` + `btnBase` for any new dialog / button.
- Generate R2 object keys via `toObjectKey`; read them with short-lived signed URLs.
- Run `yarn lint:fix` before handing work back.

Don't:

- Call `toast()` from `react-toastify` directly, or mount a second `ToastContainer`.
- Put images or large blobs in `localStorage` (use IndexedDB via the `sessionDb` pattern).
- Bypass the two-step upload — no direct server body uploads for images.
- Hand-edit generated SQL in `drizzle/`; always add a new migration with `drizzle-kit`.
- Introduce Zod or another validation library; stick with the in-house `isX` predicates.
- Assume `ctx.params` is synchronous — it's a Promise in Next.js 16.
- Rename the middleware export; it must stay `proxy` in [src/proxy.ts](src/proxy.ts).
