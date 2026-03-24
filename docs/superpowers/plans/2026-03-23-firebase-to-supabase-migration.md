# Firebase to Supabase Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate CHAVES Adventure completely from Firebase to Supabase — zero Firebase dependencies remaining.

**Architecture:** Layer-by-layer migration (Auth → Database → Storage → Pages → Cleanup). Each layer is fully migrated before the next. The Supabase provider replaces the Firebase provider, new hooks replace old ones, and all pages are updated to use the new hooks.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (Auth + PostgreSQL + Storage + Realtime), Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-23-firebase-to-supabase-migration-design.md`

---

## File Structure

### New files to create:
- `src/supabase/config.ts` — Supabase client initialization
- `src/supabase/provider.tsx` — React context provider (replaces `src/firebase/provider.tsx`)
- `src/supabase/client-provider.tsx` — Client wrapper component (replaces `src/firebase/client-provider.tsx`)
- `src/supabase/hooks.ts` — `useSupabase()`, `useUser()`, `useAuth()` hooks
- `src/supabase/use-collection.ts` — Real-time collection subscription hook (replaces `src/firebase/firestore/use-collection.tsx`)
- `src/supabase/use-doc.ts` — Real-time single document subscription hook (replaces `src/firebase/firestore/use-doc.tsx`)
- `src/supabase/errors.ts` — Error types for Supabase (replaces `src/firebase/errors.ts`)
- `src/supabase/error-emitter.ts` — Error event emitter (replaces `src/firebase/error-emitter.ts`)
- `src/supabase/non-blocking-updates.ts` — Fire-and-forget write wrappers (replaces `src/firebase/non-blocking-updates.tsx`)
- `supabase/migrations/001_initial_schema.sql` — Database schema migration

### Files to modify:
- `src/lib/types.ts` — Update all type field names from camelCase to snake_case to match PostgreSQL columns
- `src/app/layout.tsx` — Swap `FirebaseClientProvider` for `SupabaseClientProvider`
- `src/app/page.tsx` — Replace Firebase hooks with Supabase hooks
- `src/app/login/page.tsx` — Replace Firebase Auth calls with Supabase Auth
- `src/app/admin/layout.tsx` — Replace admin check with Supabase hook
- `src/app/admin/page.tsx` — Replace Firebase hooks (useCollection, Timestamp, useMemoFirebase)
- `src/app/admin/pagina-principal/page.tsx` — Replace Firebase imports (useDoc, useFirestore, useMemoFirebase)
- `src/app/admin/configuracao-pix/page.tsx` — Replace Firebase imports
- `src/app/adventures/[slug]/page.tsx` — Replace Firestore query with Supabase query
- `src/app/adventures/[slug]/pagamento/page.tsx` — Replace transaction with RPC function call
- `src/app/adventures/[slug]/_components/registration-form.tsx` — Replace Firestore write with Supabase insert
- `src/app/admin/adventures/page.tsx` — Replace collection hook
- `src/app/admin/adventures/_components/adventure-form.tsx` — Replace Firestore writes
- `src/app/admin/registrations/page.tsx` — Replace collection hook + Timestamp handling
- `src/app/admin/pagina-principal/_components/home-page-form.tsx` — Replace doc hook + writes, unwrap `data` jsonb
- `src/app/admin/configuracao-pix/_components/pix-config-form.tsx` — Replace doc hook + writes, unwrap `data` jsonb
- `src/app/admin/paginas/_components/content-page-form.tsx` — Replace doc hook + writes
- `src/app/admin/paginas/page.tsx` — Replace collection hook
- `src/app/admin/paginas/[slug]/page.tsx` — Replace doc hook
- `src/app/admin/adventures/[id]/edit/page.tsx` — Replace doc hook
- `src/app/admin/adventures/new/page.tsx` — Check for Firebase usage
- `src/app/pages/[slug]/page.tsx` — Replace Firestore query
- `src/hooks/use-is-admin.ts` — Rewrite for Supabase app_metadata
- `src/components/image-upload.tsx` — Replace Firebase Storage with Supabase Storage
- `src/components/FirebaseErrorListener.tsx` — Rename and adapt for Supabase errors
- `src/components/layout/header.tsx` — Replace collection hook
- `src/components/layout/footer.tsx` — Replace doc hook, unwrap `data` jsonb for social URLs
- `src/components/adventure-card.tsx` — Check for Firebase imports
- `next.config.ts` — Update remote patterns
- `package.json` — Swap firebase for @supabase/supabase-js

### Files to delete:
- `src/firebase/` (entire directory)
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `firebase.json`
- `apphosting.yaml`

---

## Task 1: Create Supabase Project and Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the Supabase project**

Use the Supabase MCP tool to create a new project. The project name should be `chaves-adventure`. Use the organization the user has access to.

- [ ] **Step 2: Write the database migration SQL**

Create `supabase/migrations/001_initial_schema.sql` with:

```sql
-- Adventures table
CREATE TABLE adventures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  duration text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'Fácil',
  image_url text NOT NULL DEFAULT '',
  image_description text NOT NULL DEFAULT '',
  registrations_enabled boolean NOT NULL DEFAULT false,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Registrations table
CREATE TABLE registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid REFERENCES adventures(id) ON DELETE SET NULL,
  adventure_title text NOT NULL DEFAULT '',
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  registration_date timestamptz DEFAULT now(),
  group_size integer NOT NULL DEFAULT 1,
  participants jsonb DEFAULT '[]'::jsonb,
  custom_data jsonb DEFAULT '{}'::jsonb,
  payment_status text NOT NULL DEFAULT 'pending',
  total_amount numeric DEFAULT 0,
  registration_token uuid DEFAULT gen_random_uuid()
);

-- Content table (homepage, pix config, etc.)
CREATE TABLE content (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Pages table
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  show_in_header boolean NOT NULL DEFAULT false,
  nav_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index for pages header query
CREATE INDEX idx_pages_header ON pages (show_in_header, nav_order);

-- Enable Row Level Security
ALTER TABLE adventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Adventures policies
CREATE POLICY "adventures_select" ON adventures FOR SELECT USING (true);
CREATE POLICY "adventures_insert" ON adventures FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "adventures_update" ON adventures FOR UPDATE USING (is_admin());
CREATE POLICY "adventures_delete" ON adventures FOR DELETE USING (is_admin());

-- Content policies
CREATE POLICY "content_select" ON content FOR SELECT USING (true);
CREATE POLICY "content_insert" ON content FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "content_update" ON content FOR UPDATE USING (is_admin());
CREATE POLICY "content_delete" ON content FOR DELETE USING (is_admin());

-- Pages policies
CREATE POLICY "pages_select" ON pages FOR SELECT USING (true);
CREATE POLICY "pages_insert" ON pages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "pages_update" ON pages FOR UPDATE USING (is_admin());
CREATE POLICY "pages_delete" ON pages FOR DELETE USING (is_admin());

-- Registrations policies
CREATE POLICY "registrations_insert" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "registrations_select_admin" ON registrations FOR SELECT USING (is_admin());
CREATE POLICY "registrations_update_admin" ON registrations FOR UPDATE USING (is_admin());
CREATE POLICY "registrations_delete" ON registrations FOR DELETE USING (is_admin());

-- RPC functions for token-based access (payment page flow)
-- These bypass RLS via SECURITY DEFINER so public users can access their own registration by token
CREATE OR REPLACE FUNCTION get_registration_by_token(p_id uuid, p_token uuid)
RETURNS SETOF registrations AS $$
  SELECT * FROM registrations WHERE id = p_id AND registration_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION confirm_payment_by_token(p_id uuid, p_token uuid)
RETURNS SETOF registrations AS $$
  UPDATE registrations
  SET payment_status = 'awaiting_confirmation'
  WHERE id = p_id
    AND registration_token = p_token
    AND payment_status NOT IN ('confirmed', 'cancelled', 'refunded')
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

-- Index for token lookups
CREATE INDEX idx_registrations_token ON registrations (registration_token);

-- Auto-update updated_at on content table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE adventures;
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE content;
ALTER PUBLICATION supabase_realtime ADD TABLE pages;
```

- [ ] **Step 3: Apply the migration**

Use the Supabase MCP tool `apply_migration` to run the SQL against the project.

- [ ] **Step 4: Create the Storage bucket**

Use the Supabase MCP tool `execute_sql` to create the images bucket:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Storage policies
CREATE POLICY "images_select" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images' AND is_admin());
CREATE POLICY "images_update" ON storage.objects FOR UPDATE USING (bucket_id = 'images' AND is_admin());
CREATE POLICY "images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'images' AND is_admin());
```

- [ ] **Step 5: Seed default content rows**

Use `execute_sql` to insert the default content rows:

```sql
INSERT INTO content (id, data) VALUES ('homepage', '{}');
INSERT INTO content (id, data) VALUES ('pix', '{"pixEnabled": false, "pixCopiaECola": "", "instructions": ""}');
```

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase database schema and migrations"
```

---

## Task 2: Update TypeScript Types for snake_case

**Files:**
- Modify: `src/lib/types.ts`

Supabase/PostgreSQL returns data with snake_case column names. All TypeScript types must be updated to match.

- [ ] **Step 1: Read `src/lib/types.ts`**

- [ ] **Step 2: Update all type fields from camelCase to snake_case**

Apply these renames across all types:

**Adventure:**
- `longDescription` → `long_description`
- `imageUrl` → `image_url`
- `imageDescription` → `image_description`
- `registrationsEnabled` → `registrations_enabled`
- `customFields` → `custom_fields`
- `created_at` (new field)

**Registration:**
- `adventureId` → `adventure_id`
- `adventureTitle` → `adventure_title`
- `registrationDate` → `registration_date` (type changes from `Timestamp` to `string`)
- `groupSize` → `group_size`
- `paymentStatus` → `payment_status`
- `totalAmount` → `total_amount`
- `registrationToken` → `registration_token`
- `customData` → `custom_data`

**ContentPage:**
- `showInHeader` → `show_in_header`
- `navOrder` → `nav_order`

**HomePageContent:** stays as-is (stored inside `data` jsonb, keys are application-defined)

**PixConfig:** stays as-is (stored inside `data` jsonb)

**CustomField:** stays as-is (stored inside `custom_fields` jsonb)

- [ ] **Step 3: Update all files that reference these type fields**

After changing the types, every file that reads/writes these fields must also update. This will be done incrementally in subsequent tasks as each page is migrated, but any shared utility code should be updated here.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: update types to snake_case for Supabase migration"
```

---

## Task 3: Install Supabase and Create Provider

**Files:**
- Create: `src/supabase/config.ts`
- Create: `src/supabase/provider.tsx`
- Create: `src/supabase/client-provider.tsx`
- Create: `src/supabase/hooks.ts`
- Modify: `package.json`

- [ ] **Step 1: Install @supabase/supabase-js**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create `src/supabase/config.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}
```

- [ ] **Step 3: Create `src/supabase/provider.tsx`**

React context provider that replaces `FirebaseProvider`. Must expose `supabase`, `user`, `loading`, and `isAdmin` state. Listen to `onAuthStateChange` for session updates. Read `user.app_metadata.is_admin` to determine admin status.

Key interface:
```typescript
interface SupabaseContextValue {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
  isAdmin: boolean
}
```

- [ ] **Step 4: Create `src/supabase/client-provider.tsx`**

Simple wrapper component that renders `SupabaseProvider` around `{children}`. This replaces `FirebaseClientProvider` in `layout.tsx`.

```typescript
'use client'
import { SupabaseProvider } from './provider'

export function SupabaseClientProvider({ children }: { children: React.ReactNode }) {
  return <SupabaseProvider>{children}</SupabaseProvider>
}
```

- [ ] **Step 5: Create `src/supabase/hooks.ts`**

Export convenience hooks that consume the context:

```typescript
export function useSupabase()  // returns supabase client
export function useUser()      // returns { user, loading }
export function useIsAdmin()   // returns { isAdmin, loading }
```

- [ ] **Step 6: Commit**

```bash
git add src/supabase/ package.json package-lock.json
git commit -m "feat: add Supabase provider and hooks"
```

---

## Task 4: Create Real-time Hooks (useCollection + useDoc)

**Files:**
- Create: `src/supabase/use-collection.ts`
- Create: `src/supabase/use-doc.ts`

- [ ] **Step 1: Create `src/supabase/use-collection.ts`**

Replace `src/firebase/firestore/use-collection.tsx`. This hook:
1. Does an initial `supabase.from(table).select()` query (with optional filters)
2. Subscribes to `postgres_changes` on the table for real-time updates
3. Returns `{ data: T[], isLoading: boolean, error: Error | null }`

**Important:** Use `isLoading` (not `loading`) to match the existing Firebase hook return type and minimize changes across all consuming components.

Signature should match the usage pattern:
```typescript
function useCollection<T>(
  table: string,
  options?: {
    filters?: Array<{ column: string; operator: string; value: unknown }>
    orderBy?: { column: string; ascending?: boolean }
  }
): { data: T[]; isLoading: boolean; error: Error | null }
```

- [ ] **Step 2: Create `src/supabase/use-doc.ts`**

Replace `src/firebase/firestore/use-doc.tsx`. This hook:
1. Does an initial `supabase.from(table).select().eq('id', id).single()` query
2. Subscribes to `postgres_changes` filtered by the specific row
3. Returns `{ data: T | null; isLoading: boolean; error: Error | null }`

Signature:
```typescript
function useDoc<T>(
  table: string,
  id: string
): { data: T | null; isLoading: boolean; error: Error | null }
```

- [ ] **Step 3: Commit**

```bash
git add src/supabase/use-collection.ts src/supabase/use-doc.ts
git commit -m "feat: add real-time useCollection and useDoc hooks for Supabase"
```

---

## Task 5: Create Error Infrastructure

**Files:**
- Create: `src/supabase/errors.ts`
- Create: `src/supabase/error-emitter.ts`
- Create: `src/supabase/non-blocking-updates.ts`

- [ ] **Step 1: Create `src/supabase/errors.ts`**

Replace `src/firebase/errors.ts`. Define `SupabasePermissionError` that wraps `PostgrestError` from Supabase. Should provide the same context fields as `FirestorePermissionError` (operation, collection/table, details).

- [ ] **Step 2: Create `src/supabase/error-emitter.ts`**

Copy the existing `errorEmitter` pattern from `src/firebase/error-emitter.ts`. The event emitter is framework-agnostic — just update the error type from Firebase to Supabase.

- [ ] **Step 3: Create `src/supabase/non-blocking-updates.ts`**

Replace `src/firebase/non-blocking-updates.tsx`. Create fire-and-forget wrappers for Supabase operations:

```typescript
export function upsertNonBlocking(table: string, data: object)    // replaces setDocumentNonBlocking
export function insertNonBlocking(table: string, data: object)    // replaces addDocumentNonBlocking
export function updateNonBlocking(table: string, id: string, data: object)  // replaces updateDocumentNonBlocking
export function deleteNonBlocking(table: string, id: string)      // replaces deleteDocumentNonBlocking
```

Each function calls the Supabase client, catches errors, and emits permission errors via `errorEmitter`.

- [ ] **Step 4: Commit**

```bash
git add src/supabase/errors.ts src/supabase/error-emitter.ts src/supabase/non-blocking-updates.ts
git commit -m "feat: add Supabase error handling and non-blocking updates"
```

---

## Task 6: Migrate Root Layout and Error Listener

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/FirebaseErrorListener.tsx` → rename to `src/components/SupabaseErrorListener.tsx`

- [ ] **Step 1: Update `src/app/layout.tsx`**

Replace `FirebaseClientProvider` import with `SupabaseClientProvider`:
- Change import from `@/firebase/client-provider` to `@/supabase/client-provider`
- Replace `<FirebaseClientProvider>` with `<SupabaseClientProvider>` in JSX

- [ ] **Step 2: Rename and update error listener**

Rename `src/components/FirebaseErrorListener.tsx` to `src/components/SupabaseErrorListener.tsx`:
- Update import from `@/firebase/error-emitter` to `@/supabase/error-emitter`
- Update error type references
- Update component name
- Update import in `layout.tsx` or wherever it's used

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/components/SupabaseErrorListener.tsx
git rm src/components/FirebaseErrorListener.tsx
git commit -m "feat: migrate root layout and error listener to Supabase"
```

---

## Task 7: Migrate Login Page (Auth)

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Read the current login page**

Read `src/app/login/page.tsx` to understand the exact Firebase auth calls and UI.

- [ ] **Step 2: Replace auth imports and calls**

- Remove all Firebase imports (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, etc.)
- Import `useSupabase` from `@/supabase/hooks`
- Replace `signInWithEmailAndPassword(auth, email, password)` with `supabase.auth.signInWithPassword({ email, password })`
- Replace `createUserWithEmailAndPassword(auth, email, password)` with `supabase.auth.signUp({ email, password })`
- Replace `auth.signOut()` with `supabase.auth.signOut()`
- Update error code handling: Firebase error codes like `'auth/invalid-credential'` become Supabase error messages
- Update the admin setup instructions text to reference Supabase instead of Firebase Console
- Check if `non-blocking-login.tsx` functions (`initiateAnonymousSignIn`, `initiateEmailSignUp`, `initiateEmailSignIn`) are used anywhere in the app. If not used, they will be deleted with the firebase directory. If used, create Supabase equivalents in `src/supabase/`

- [ ] **Step 3: Verify the page compiles**

```bash
npx next build --no-lint 2>&1 | head -50
```

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: migrate login page to Supabase Auth"
```

---

## Task 8: Migrate Admin Layout and useIsAdmin

**Files:**
- Modify: `src/hooks/use-is-admin.ts`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Read current files**

Read `src/hooks/use-is-admin.ts` and `src/app/admin/layout.tsx`.

- [ ] **Step 2: Rewrite `src/hooks/use-is-admin.ts`**

Replace the Firestore-based admin check with Supabase `app_metadata`:

```typescript
import { useUser } from '@/supabase/hooks'

export function useIsAdmin() {
  const { user, loading } = useUser()
  const isAdmin = user?.app_metadata?.is_admin === true
  return { isAdmin, loading }
}
```

- [ ] **Step 3: Update `src/app/admin/layout.tsx`**

Replace Firebase imports with Supabase imports. The `useIsAdmin()` hook signature should remain the same, so the layout may need minimal changes — mainly updating imports if it directly uses Firebase hooks.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-is-admin.ts src/app/admin/layout.tsx
git commit -m "feat: migrate admin layout and useIsAdmin to Supabase"
```

---

## Task 9: Migrate Home Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read `src/app/page.tsx`**

- [ ] **Step 2: Replace Firebase hooks with Supabase hooks**

- Replace `useCollection('adventures')` with `useCollection<Adventure>('adventures')`
- Replace `useDoc('content', 'homepage')` with `useDoc<{ data: HomePageContent }>('content', 'homepage')`
- Update how the content data is accessed (it's now nested under `data` jsonb column)
- Update imports from `@/firebase/...` to `@/supabase/...`

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: migrate home page to Supabase"
```

---

## Task 10: Migrate Header and Footer

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Update `header.tsx`**

Replace Firebase collection hook for pages with Supabase `useCollection`. The header fetches pages where `showInHeader` is true and sorts by `navOrder`. Update field names to snake_case (`show_in_header`, `nav_order`).

- [ ] **Step 3: Update `footer.tsx`**

Replace Firebase doc hook for homepage content with Supabase `useDoc`. Update to read social media URLs from the `data` jsonb field.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/header.tsx src/components/layout/footer.tsx
git commit -m "feat: migrate header and footer to Supabase"
```

---

## Task 11: Migrate Adventure Detail Page

**Files:**
- Modify: `src/app/adventures/[slug]/page.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Replace Firestore query**

The current `useFetchAdventure` hook uses `getDocs(query(collection(firestore, 'adventures'), where('slug', '==', slug)))`. Replace with:

```typescript
const { data } = await supabase.from('adventures').select().eq('slug', slug).single()
```

Or if using real-time, use `useCollection` with a slug filter. Update field name references to snake_case.

- [ ] **Step 3: Commit**

```bash
git add src/app/adventures/[slug]/page.tsx
git commit -m "feat: migrate adventure detail page to Supabase"
```

---

## Task 12: Migrate Registration Form

**Files:**
- Modify: `src/app/adventures/[slug]/_components/registration-form.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Replace Firestore write**

- Replace `addDoc(collection(firestore, 'registrations'), {...})` with `supabase.from('registrations').insert({...}).select().single()`
- The `.select()` returns the inserted row including `registration_token` — no need for a separate `getDoc` call
- Remove `serverTimestamp()` — the `registration_date` column has `DEFAULT now()`
- Update field names to snake_case in the insert payload
- Update imports

- [ ] **Step 3: Commit**

```bash
git add src/app/adventures/[slug]/_components/registration-form.tsx
git commit -m "feat: migrate registration form to Supabase"
```

---

## Task 13: Migrate Payment Page

**Files:**
- Modify: `src/app/adventures/[slug]/pagamento/page.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Replace registration read with RPC function**

The payment page is accessed by public (unauthenticated) users. Since RLS blocks unauthenticated reads, use the `get_registration_by_token` RPC function created in Task 1:

```typescript
const { data, error } = await supabase.rpc('get_registration_by_token', {
  p_id: registrationId,
  p_token: token
})
```

- [ ] **Step 3: Replace transaction with RPC function**

Replace `runTransaction` with the `confirm_payment_by_token` RPC function:

```typescript
const { data, error } = await supabase.rpc('confirm_payment_by_token', {
  p_id: registrationId,
  p_token: token
})
```

This atomically updates the payment status only if it's not already confirmed/cancelled/refunded.

- [ ] **Step 4: Replace PIX config read and update types**

- Replace Firestore `getDoc` for PIX config with `supabase.from('content').select('data').eq('id', 'pix').single()` — this works because `content` has public SELECT
- Unwrap the `data` jsonb field: `pixConfig = result.data.data` (the content row's `data` column contains `pixCopiaECola`, `pixEnabled`, `instructions`)
- Update `Timestamp.toDate()` calls to `new Date(isoString)`

- [ ] **Step 5: Commit**

```bash
git add src/app/adventures/[slug]/pagamento/page.tsx
git commit -m "feat: migrate payment page to Supabase"
```

---

## Task 14: Migrate Image Upload Component

**Files:**
- Modify: `src/components/image-upload.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Replace Firebase Storage with Supabase Storage**

- Remove Firebase Storage imports (`ref`, `uploadBytesResumable`, `getDownloadURL`, `deleteObject`)
- Import `useSupabase` from `@/supabase/hooks`
- **Upload:** Replace `uploadBytesResumable` with `supabase.storage.from('images').upload(path, file)`. For progress tracking, use `XMLHttpRequest` with `onprogress`:

```typescript
const xhr = new XMLHttpRequest()
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) setProgress((e.loaded / e.total) * 100)
})
// Upload to Supabase Storage REST endpoint
```

Alternatively, use the simpler approach without progress tracking if acceptable:
```typescript
const { data, error } = await supabase.storage.from('images').upload(path, file)
const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
```

- **Delete:** Replace `deleteObject(ref)` with `supabase.storage.from('images').remove([path])`
- **URL detection:** Replace `firebasestorage.googleapis.com` / `firebasestorage.app` check with the Supabase Storage URL pattern (contains the project's Supabase URL)
- **Public URL:** Replace `getDownloadURL` with `supabase.storage.from('images').getPublicUrl(path)`

- [ ] **Step 3: Commit**

```bash
git add src/components/image-upload.tsx
git commit -m "feat: migrate image upload to Supabase Storage"
```

---

## Task 15: Migrate Admin Adventures Pages

**Files:**
- Modify: `src/app/admin/adventures/page.tsx`
- Modify: `src/app/admin/adventures/_components/adventure-form.tsx`
- Modify: `src/app/admin/adventures/[id]/edit/page.tsx`
- Modify: `src/app/admin/adventures/new/page.tsx`

- [ ] **Step 1: Read all 4 files**

- [ ] **Step 2: Update `src/app/admin/adventures/page.tsx`**

Replace Firebase `useCollection` with Supabase `useCollection`. Replace `deleteDoc` with `deleteNonBlocking` or direct Supabase delete. Update field names to snake_case.

- [ ] **Step 3: Update `adventure-form.tsx`**

Replace Firestore `setDoc`/`addDoc`/`updateDoc` with Supabase equivalents:
- Create: `supabase.from('adventures').insert(data)`
- Update: `supabase.from('adventures').update(data).eq('id', id)`
- Update field names to snake_case in the payload

- [ ] **Step 4: Update edit and new pages**

Replace Firebase doc hooks and imports with Supabase equivalents.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/adventures/
git commit -m "feat: migrate admin adventures pages to Supabase"
```

---

## Task 16: Migrate Admin Registrations Page

**Files:**
- Modify: `src/app/admin/registrations/page.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Replace Firebase hooks and operations**

- Replace `useCollection` with Supabase version
- Replace `updateDoc` for payment status with `supabase.from('registrations').update({ payment_status }).eq('id', id)`
- Replace `deleteDoc` with `supabase.from('registrations').delete().eq('id', id)`
- Replace `Timestamp.toDate()` with `new Date(isoString)` for `registration_date`
- Update all field names to snake_case

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/registrations/page.tsx
git commit -m "feat: migrate admin registrations page to Supabase"
```

---

## Task 17: Migrate Admin Content Pages (Homepage, PIX, Pages)

**Files:**
- Modify: `src/app/admin/pagina-principal/page.tsx` — Has Firebase imports (useDoc, useFirestore, useMemoFirebase)
- Modify: `src/app/admin/pagina-principal/_components/home-page-form.tsx`
- Modify: `src/app/admin/configuracao-pix/page.tsx` — Has Firebase imports
- Modify: `src/app/admin/configuracao-pix/_components/pix-config-form.tsx`
- Modify: `src/app/admin/paginas/_components/content-page-form.tsx`
- Modify: `src/app/admin/paginas/page.tsx`
- Modify: `src/app/admin/paginas/[slug]/page.tsx`
- Modify: `src/app/pages/[slug]/page.tsx`

- [ ] **Step 1: Read all files** (including both parent pages and form components)

- [ ] **Step 2: Migrate homepage parent page and form**

- Update `src/app/admin/pagina-principal/page.tsx`: replace Firebase imports (`useDoc`, `useFirestore`, `useMemoFirebase`, `doc`) with Supabase `useDoc` hook
- Update `home-page-form.tsx`: replace `useDoc('content', 'homepage')` with Supabase `useDoc('content', 'homepage')`
- **Important — jsonb unwrapping:** Content data is stored in a `data` jsonb column. When reading, extract fields from `doc.data` (e.g., `doc.data.heroTitle`). When writing, wrap: `supabase.from('content').upsert({ id: 'homepage', data: formData })`

- [ ] **Step 3: Migrate PIX config parent page and form**

- Update `src/app/admin/configuracao-pix/page.tsx`: replace Firebase imports with Supabase hooks
- Update `pix-config-form.tsx`: same jsonb pattern as homepage — reads from `doc.data.pixCopiaECola`, `doc.data.pixEnabled`, etc. Writes wrap in `{ id: 'pix', data: formData }`

- [ ] **Step 4: Migrate pages management**

- Replace collection hooks for `pages` table
- Replace CRUD operations with Supabase equivalents
- Update field names to snake_case (`showInHeader` → `show_in_header`, `navOrder` → `nav_order`)
- Note: pages use slug as document ID in Firestore but will use auto-generated UUID in Supabase with a separate `slug` column

- [ ] **Step 5: Migrate public pages view**

Update `src/app/pages/[slug]/page.tsx` to query Supabase instead of Firestore.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/pagina-principal/ src/app/admin/configuracao-pix/ src/app/admin/paginas/ src/app/pages/
git commit -m "feat: migrate admin content pages to Supabase"
```

---

## Task 18: Migrate Admin Dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Read the file**

This file has substantial Firebase usage: imports `useCollection`, `useMemoFirebase`, `Timestamp` from Firebase, and uses a `FirestoreRegistration` type with Firestore `Timestamp`.

- [ ] **Step 2: Replace Firebase hooks and types**

- Replace `useCollection` with Supabase version
- Remove `useMemoFirebase` (no longer needed — Supabase hooks take simple string args)
- Remove `Timestamp` import — replace `reg.registrationDate.toDate()` with `new Date(reg.registration_date)`
- Remove the `FirestoreRegistration` type and use the standard `Registration` type (which now has `registration_date: string` instead of `Timestamp`)
- Update all field name references to snake_case

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: migrate admin dashboard to Supabase"
```

---

## Task 19: Update next.config.ts and Environment

**Files:**
- Modify: `next.config.ts`
- Create: `.env.local` (add to .gitignore if not already)

- [ ] **Step 1: Read `next.config.ts`**

- [ ] **Step 2: Update remote patterns**

- Remove the Firebase Storage remote pattern (`firebasestorage.app` / `firebasestorage.googleapis.com`)
- Keep/update the Supabase remote pattern for the new project URL
- Keep Unsplash and Picsum patterns if still needed

- [ ] **Step 3: Create `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Get the actual values from the Supabase project using the MCP tool `get_project_url` and `get_publishable_keys`.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat: update next.config for Supabase"
```

---

## Task 20: Full Build Verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Fix any TypeScript errors, missing imports, or broken references. All pages must compile.

- [ ] **Step 2: Search for remaining Firebase references**

```bash
grep -r "firebase" src/ --include="*.ts" --include="*.tsx" -l
grep -r "firestore" src/ --include="*.ts" --include="*.tsx" -l
```

If any files still reference Firebase, update them.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from Supabase migration"
```

---

## Task 21: Migrate Existing Images from Firebase Storage

**Files:**
- None (script-based, one-time operation)

This task migrates existing images from Firebase Storage to Supabase Storage and updates the URLs in the database.

- [ ] **Step 1: List existing images in Firebase Storage**

Use the Firebase Storage console or API to identify all images in `adventures/`, `homepage/`, and `images/` folders.

- [ ] **Step 2: Download and re-upload to Supabase Storage**

For each image:
1. Download from Firebase Storage URL
2. Upload to Supabase Storage in the same path structure under the `images` bucket
3. Get the new public URL via `supabase.storage.from('images').getPublicUrl(path)`

This can be done via a one-time script or manually if the number of images is small.

- [ ] **Step 3: Update URLs in the database**

Update `image_url` in `adventures` table and `heroImageUrl` in the `content` table's `data` jsonb (for `id = 'homepage'`) to point to the new Supabase Storage URLs.

- [ ] **Step 4: Verify all images load correctly**

Check the app to confirm all images render from Supabase Storage URLs.

---

## Task 22: Firebase Cleanup

**Files:**
- Delete: `src/firebase/` (entire directory)
- Delete: `firestore.rules`
- Delete: `storage.rules`
- Delete: `firestore.indexes.json`
- Delete: `firebase.json`
- Delete: `apphosting.yaml`
- Modify: `package.json` (remove firebase dependency)

- [ ] **Step 1: Remove Firebase package**

```bash
npm uninstall firebase
```

- [ ] **Step 2: Delete all Firebase files**

```bash
rm -rf src/firebase/
rm -f firestore.rules storage.rules firestore.indexes.json firebase.json apphosting.yaml
```

- [ ] **Step 3: Remove the old FirebaseErrorListener if not already removed**

```bash
rm -f src/components/FirebaseErrorListener.tsx
```

- [ ] **Step 4: Final grep for any remaining Firebase references**

```bash
grep -r "firebase" . --include="*.ts" --include="*.tsx" --include="*.json" -l | grep -v node_modules | grep -v .git
```

Fix any remaining references.

- [ ] **Step 5: Run the build one more time**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove all Firebase dependencies and files"
```

---

## Task 23: Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Manual verification checklist**

Test each of these flows:
- Home page loads with adventures and homepage content
- Adventure detail page loads correctly
- Registration form submits successfully
- Payment page loads and updates payment status
- Login works with email/password
- Admin panel is accessible after login
- Admin can create/edit/delete adventures
- Image upload works in admin
- Admin can manage registrations (view, update payment status, delete)
- Homepage content editing works
- PIX configuration works
- Pages management works (create, edit, show in header)
- Header shows correct navigation links
- Footer shows correct social links

- [ ] **Step 3: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: resolve issues found during smoke testing"
```
